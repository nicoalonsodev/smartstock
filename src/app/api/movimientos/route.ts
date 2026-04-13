import { NextResponse, type NextRequest } from 'next/server';

import { getTenantSession, rejectIfVisor } from '@/lib/api/tenant-session';
import { moduloGuard } from '@/lib/modulos/guard';

export async function GET(request: NextRequest) {
  const guard = await moduloGuard('stock');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const { searchParams } = new URL(request.url);
  const productoId = searchParams.get('producto_id');
  const tipo = searchParams.get('tipo');
  const pagina = Math.max(1, parseInt(searchParams.get('pagina') ?? '1', 10));
  const porPagina = Math.min(100, Math.max(1, parseInt(searchParams.get('por_pagina') ?? '50', 10)));
  const offset = (pagina - 1) * porPagina;

  let query = session.supabase
    .from('movimiento')
    .select(
      '*, producto:producto_id(id, codigo, nombre), usuario:usuario_id(nombre, apellido)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + porPagina - 1);

  if (productoId) query = query.eq('producto_id', productoId);
  if (tipo) {
    query = query.eq('tipo', tipo as 'entrada' | 'salida' | 'ajuste');
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    movimientos: data ?? [],
    total: count ?? 0,
    pagina,
    por_pagina: porPagina,
    total_paginas: Math.ceil((count ?? 0) / porPagina),
  });
}

export async function POST(request: Request) {
  const guard = await moduloGuard('stock');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const forbidden = rejectIfVisor(session.rol);
  if (forbidden) return forbidden;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const b =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};

  const productoId = typeof b.producto_id === 'string' ? b.producto_id : '';
  const tipo = typeof b.tipo === 'string' ? b.tipo : '';
  const cantidad = Number(b.cantidad);

  if (!productoId || !tipo || Number.isNaN(cantidad)) {
    return NextResponse.json(
      { error: 'producto_id, tipo y cantidad son requeridos' },
      { status: 400 }
    );
  }

  if (!['entrada', 'salida', 'ajuste'].includes(tipo)) {
    return NextResponse.json({ error: 'tipo debe ser entrada, salida o ajuste' }, { status: 400 });
  }

  if (cantidad <= 0) {
    return NextResponse.json({ error: 'cantidad debe ser mayor a 0' }, { status: 400 });
  }

  const { data, error } = await session.supabase.rpc('registrar_movimiento', {
    p_tenant_id: session.tenantId,
    p_producto_id: productoId,
    p_tipo: tipo as 'entrada' | 'salida' | 'ajuste',
    p_cantidad: cantidad,
    p_motivo: b.motivo != null ? String(b.motivo) : null,
    p_referencia_tipo:
      (b.referencia_tipo as 'manual' | 'factura' | 'pedido' | 'importacion' | 'ajuste_inventario' | null) ??
      'manual',
    p_referencia_id: typeof b.referencia_id === 'string' ? b.referencia_id : null,
    p_usuario_id: session.userId,
  });

  if (error) {
    if (error.message.includes('Stock insuficiente')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error.message.includes('Producto no encontrado')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
