import { NextResponse } from 'next/server';

import { getTenantSession } from '@/lib/api/tenant-session';
import { moduloGuard } from '@/lib/modulos/guard';

export async function GET() {
  const guard = await moduloGuard('stock');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const en30dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data, error } = await session.supabase
    .from('producto')
    .select('id, codigo, nombre, fecha_vencimiento, stock_actual')
    .eq('activo', true)
    .not('fecha_vencimiento', 'is', null)
    .lte('fecha_vencimiento', en30dias)
    .order('fecha_vencimiento', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const productos = (data ?? []).map((p) => {
    const dias = Math.ceil(
      (new Date(p.fecha_vencimiento!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return {
      ...p,
      dias_restantes: dias,
      estado: (dias < 0 ? 'vencido' : dias <= 7 ? 'critico' : 'proximo') as
        | 'vencido'
        | 'critico'
        | 'proximo',
    };
  });

  return NextResponse.json({
    productos,
    vencidos: productos.filter((p) => p.estado === 'vencido').length,
    criticos: productos.filter((p) => p.estado === 'critico').length,
    proximos: productos.filter((p) => p.estado === 'proximo').length,
  });
}
