import { NextResponse } from 'next/server';

import { getTenantSession } from '@/lib/api/tenant-session';
import { moduloGuard } from '@/lib/modulos/guard';

export async function GET() {
  const guard = await moduloGuard('stock');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const { data, error } = await session.supabase
    .from('producto')
    .select('id, codigo, nombre, stock_actual, stock_minimo, proveedor:proveedor_id(nombre)')
    .eq('activo', true)
    .gt('stock_minimo', 0)
    .order('nombre');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const productos = (data ?? []).filter((p) => p.stock_actual <= p.stock_minimo);

  return NextResponse.json({
    productos,
    total: productos.length,
  });
}
