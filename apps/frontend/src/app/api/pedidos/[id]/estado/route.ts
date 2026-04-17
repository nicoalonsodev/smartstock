import { NextResponse } from 'next/server';

import { getTenantSession, rejectIfVisor } from '@/lib/api/tenant-session';
import { moduloGuard } from '@/lib/modulos/guard';
import { obtenerStockComprometidoPorProducto } from '@/lib/stock/comprometido';
import type { Database } from '@/types/database';

type EstadoPedido = Database['public']['Enums']['estado_pedido'];

const TRANSICIONES_VALIDAS: Record<EstadoPedido, EstadoPedido[]> = {
  borrador: ['confirmado', 'cancelado'],
  confirmado: ['entregado', 'cancelado'],
  entregado: [],
  cancelado: [],
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await moduloGuard('pedidos');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const forbidden = rejectIfVisor(session.rol);
  if (forbidden) return forbidden;

  const { id: pedidoId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const estadoRaw =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>).estado
      : undefined;
  const nuevoEstado = typeof estadoRaw === 'string' ? estadoRaw : '';

  const { data: pedido, error: pedErr } = await session.supabase
    .from('pedido')
    .select(
      'id, estado, items:pedido_item(producto_id, cantidad)'
    )
    .eq('id', pedidoId)
    .maybeSingle();

  if (pedErr) {
    return NextResponse.json({ error: pedErr.message }, { status: 500 });
  }
  if (!pedido) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  }

  const items = (pedido as { items: { producto_id: string; cantidad: number }[] }).items ?? [];

  const transicionesPermitidas = TRANSICIONES_VALIDAS[pedido.estado as EstadoPedido] ?? [];
  if (!transicionesPermitidas.includes(nuevoEstado as EstadoPedido)) {
    return NextResponse.json(
      {
        error: `No se puede pasar de '${pedido.estado}' a '${nuevoEstado}'`,
      },
      { status: 400 }
    );
  }

  if (nuevoEstado === 'confirmado') {
    const porProducto = new Map<string, number>();
    for (const item of items) {
      porProducto.set(item.producto_id, (porProducto.get(item.producto_id) ?? 0) + item.cantidad);
    }
    const ids = [...porProducto.keys()];
    const comprometido = await obtenerStockComprometidoPorProducto(
      session.supabase,
      ids,
      { excluirPedidoId: pedidoId }
    );

    for (const [productoId, cantPedido] of porProducto) {
      const { data: prod, error: pErr } = await session.supabase
        .from('producto')
        .select('nombre, stock_actual')
        .eq('id', productoId)
        .maybeSingle();

      if (pErr || !prod) {
        return NextResponse.json({ error: 'Producto no encontrado en el pedido' }, { status: 400 });
      }

      const comp = comprometido.get(productoId) ?? 0;
      const disponible = prod.stock_actual - comp;
      if (disponible < cantPedido) {
        return NextResponse.json(
          {
            error: `Stock insuficiente para "${prod.nombre}". Disponible: ${disponible} (actual ${prod.stock_actual}, comprometido ${comp}), pedido: ${cantPedido}`,
          },
          { status: 400 }
        );
      }
    }
  }

  if (nuevoEstado === 'entregado') {
    for (const item of items) {
      const { error: movError } = await session.supabase.rpc('registrar_movimiento', {
        p_tenant_id: session.tenantId,
        p_producto_id: item.producto_id,
        p_tipo: 'salida',
        p_cantidad: item.cantidad,
        p_motivo: `Entrega pedido #${pedidoId.slice(0, 8)}`,
        p_referencia_tipo: 'pedido',
        p_referencia_id: pedidoId,
        p_usuario_id: session.userId,
      });

      if (movError) {
        return NextResponse.json(
          { error: `Error al descontar stock: ${movError.message}` },
          { status: 400 }
        );
      }
    }
  }

  const { data: pedidoActualizado, error } = await session.supabase
    .from('pedido')
    .update({ estado: nuevoEstado as EstadoPedido })
    .eq('id', pedidoId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(pedidoActualizado);
}
