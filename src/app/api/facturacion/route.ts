import { NextResponse, type NextRequest } from 'next/server';

import { getTenantSession } from '@/lib/api/tenant-session';
import { moduloGuard } from '@/lib/modulos/guard';

export async function GET(request: NextRequest) {
  const guard = await moduloGuard('facturador_simple');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get('tipo');
  const estado = searchParams.get('estado');
  const clienteId = searchParams.get('cliente_id');
  const pagina = parseInt(searchParams.get('pagina') ?? '1');
  const porPagina = parseInt(searchParams.get('por_pagina') ?? '25');
  const offset = (pagina - 1) * porPagina;

  let query = session.supabase
    .from('comprobante')
    .select(
      '*, cliente:cliente_id(nombre, razon_social), usuario:usuario_id(nombre, apellido)',
      { count: 'exact' },
    )
    .order('fecha', { ascending: false })
    .order('numero', { ascending: false })
    .range(offset, offset + porPagina - 1);

  if (tipo) query = query.eq('tipo', tipo as never);
  if (estado) query = query.eq('estado', estado as never);
  if (clienteId) query = query.eq('cliente_id', clienteId);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    comprobantes: data,
    total: count,
    pagina,
    por_pagina: porPagina,
  });
}
