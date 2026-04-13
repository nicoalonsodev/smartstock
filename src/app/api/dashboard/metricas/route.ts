import { NextResponse } from 'next/server';

import { getTenantSession } from '@/lib/api/tenant-session';

function inicioYFinMesLocal(): { desde: string; hasta: string } {
  const ahora = new Date();
  const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const fin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  return { desde: fmt(inicio), hasta: fmt(fin) };
}

function redondear2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function GET() {
  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const { desde, hasta } = inicioYFinMesLocal();

  const [
    countProductos,
    filasStock,
    countComprobantes,
    filasVentas,
  ] = await Promise.all([
    session.supabase
      .from('producto')
      .select('id', { count: 'exact', head: true })
      .eq('activo', true),
    session.supabase
      .from('producto')
      .select('stock_actual, precio_costo')
      .eq('activo', true),
    session.supabase
      .from('comprobante')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'emitido')
      .gte('fecha', desde)
      .lte('fecha', hasta),
    session.supabase
      .from('comprobante')
      .select('total, tipo')
      .eq('estado', 'emitido')
      .gte('fecha', desde)
      .lte('fecha', hasta),
  ]);

  if (countProductos.error) {
    return NextResponse.json({ error: countProductos.error.message }, { status: 500 });
  }
  if (filasStock.error) {
    return NextResponse.json({ error: filasStock.error.message }, { status: 500 });
  }
  if (countComprobantes.error) {
    return NextResponse.json({ error: countComprobantes.error.message }, { status: 500 });
  }
  if (filasVentas.error) {
    return NextResponse.json({ error: filasVentas.error.message }, { status: 500 });
  }

  let valorInventario = 0;
  for (const row of filasStock.data ?? []) {
    valorInventario += Number(row.stock_actual) * Number(row.precio_costo);
  }
  valorInventario = redondear2(valorInventario);

  let ventasMes = 0;
  for (const row of filasVentas.data ?? []) {
    if (row.tipo === 'presupuesto') continue;
    const t = Number(row.total);
    if (row.tipo.startsWith('nota_credito')) ventasMes -= t;
    else ventasMes += t;
  }
  ventasMes = redondear2(ventasMes);

  return NextResponse.json({
    productos_activos: countProductos.count ?? 0,
    valor_inventario: valorInventario,
    comprobantes_mes: countComprobantes.count ?? 0,
    ventas_mes: ventasMes,
    periodo: { desde, hasta },
  });
}
