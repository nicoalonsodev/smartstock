import { getTenantSession } from '@/lib/api/tenant-session';
import { moduloGuard } from '@/lib/modulos/guard';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const guard = await moduloGuard('ia_precios');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const { searchParams } = new URL(request.url);
  const productoId = searchParams.get('producto_id');
  const origen = searchParams.get('origen');
  const pagina = parseInt(searchParams.get('pagina') ?? '1', 10);
  const porPagina = parseInt(searchParams.get('por_pagina') ?? '50', 10);
  const offset = (pagina - 1) * porPagina;

  let query = session.supabase
    .from('precio_historial')
    .select(
      '*, producto:producto_id(id, codigo, nombre)',
      { count: 'exact' },
    )
    .eq('tenant_id', session.tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + porPagina - 1);

  if (productoId) query = query.eq('producto_id', productoId);
  if (origen && ['manual', 'importacion_excel', 'ia_pdf'].includes(origen)) {
    query = query.eq('origen', origen as 'manual' | 'importacion_excel' | 'ia_pdf');
  }

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    historial: data,
    total: count,
    pagina,
    por_pagina: porPagina,
  });
}
