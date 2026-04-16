import { NextResponse } from 'next/server';

import { getTenantSession } from '@/lib/api/tenant-session';
import { moduloGuard } from '@/lib/modulos/guard';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await moduloGuard('analizador_rentabilidad');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const { id } = await params;

  const { data: lista, error: listaErr } = await session.supabase
    .from('lista_precios')
    .select('*, proveedor:proveedor_id(id, nombre)')
    .eq('id', id)
    .maybeSingle();

  if (listaErr) {
    return NextResponse.json({ error: listaErr.message }, { status: 500 });
  }

  if (!lista) {
    return NextResponse.json({ error: 'Lista no encontrada' }, { status: 404 });
  }

  const { data: items, error: itemsErr } = await session.supabase
    .from('lista_precios_item')
    .select('*')
    .eq('lista_id', id)
    .order('orden', { ascending: true });

  if (itemsErr) {
    return NextResponse.json({ error: itemsErr.message }, { status: 500 });
  }

  return NextResponse.json({ lista, items: items ?? [] });
}
