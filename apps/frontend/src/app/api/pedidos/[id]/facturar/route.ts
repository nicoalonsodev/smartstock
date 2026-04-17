import { NextResponse } from 'next/server';

import { getTenantSession, rejectIfVisor } from '@/lib/api/tenant-session';
import { emitirComprobante } from '@/lib/facturacion/emitir-comprobante';
import { moduloGuard } from '@/lib/modulos/guard';
import type { Database } from '@/types/database';

const TIPOS_FACTURA = new Set(['factura_a', 'factura_b', 'factura_c']);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await moduloGuard('pedidos');
  if (!guard.allowed) return guard.response;

  const facGuard = await moduloGuard('facturador_simple');
  if (!facGuard.allowed) return facGuard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const forbidden = rejectIfVisor(session.rol);
  if (forbidden) return forbidden;

  const { id: pedidoId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const tipoRaw =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>).tipo
      : undefined;
  const tipo =
    typeof tipoRaw === 'string' && TIPOS_FACTURA.has(tipoRaw)
      ? tipoRaw
      : ('factura_c' as Database['public']['Enums']['tipo_comprobante']);

  const { data: pedido, error: pErr } = await session.supabase
    .from('pedido')
    .select(
      `
      id,
      estado,
      cliente_id,
      comprobante_id,
      items:pedido_item(producto_id, cantidad, precio_unitario)
    `
    )
    .eq('id', pedidoId)
    .maybeSingle();

  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }
  if (!pedido) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  }

  if (pedido.estado !== 'entregado') {
    return NextResponse.json(
      { error: 'Solo se pueden facturar pedidos en estado "entregado"' },
      { status: 400 }
    );
  }

  if (pedido.comprobante_id) {
    return NextResponse.json({ error: 'Este pedido ya tiene un comprobante asociado' }, { status: 409 });
  }

  if (!pedido.cliente_id) {
    return NextResponse.json(
      { error: 'El pedido debe tener un cliente asignado para generar la factura' },
      { status: 400 }
    );
  }

  const items = (pedido as { items: { producto_id: string; cantidad: number; precio_unitario: number }[] })
    .items ?? [];
  if (!items.length) {
    return NextResponse.json({ error: 'El pedido no tiene ítems' }, { status: 400 });
  }

  const result = await emitirComprobante(
    session.supabase,
    { tenantId: session.tenantId, userId: session.userId },
    {
      tipo,
      cliente_id: pedido.cliente_id,
      items: items.map((i) => ({
        producto_id: i.producto_id,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
      })),
      notas: `Generado desde pedido #${pedidoId.slice(0, 8)}`,
    },
    { omitirMovimientosStock: true }
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const comprobanteId = result.data.comprobante.id;

  const { error: linkErr } = await session.supabase
    .from('pedido')
    .update({ comprobante_id: comprobanteId })
    .eq('id', pedidoId);

  if (linkErr) {
    return NextResponse.json(
      { error: `Comprobante emitido pero no se pudo vincular al pedido: ${linkErr.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      pedido_id: pedidoId,
      comprobante_id: comprobanteId,
      pdf_url: result.data.comprobante.pdf_url,
      comprobante: result.data.comprobante,
    },
    { status: 201 }
  );
}
