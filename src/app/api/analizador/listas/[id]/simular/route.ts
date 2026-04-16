import { NextResponse } from 'next/server';

import { getTenantSession, rejectIfVisor } from '@/lib/api/tenant-session';
import { moduloGuard } from '@/lib/modulos/guard';

// ---------------------------------------------------------------------------
// GET /api/analizador/listas/[id]/simular — Return items ready for simulation
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await moduloGuard('analizador_rentabilidad');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const { id } = await params;

  const { data: lista } = await session.supabase
    .from('lista_precios')
    .select('id, estado, variacion_promedio_pct, margen_global_anterior_pct, margen_global_nuevo_pct')
    .eq('id', id)
    .maybeSingle();

  if (!lista) {
    return NextResponse.json({ error: 'Lista no encontrada' }, { status: 404 });
  }

  const { data: items, error } = await session.supabase
    .from('lista_precios_item')
    .select('id, nombre_raw, precio_lista, precio_costo_anterior, precio_venta_actual, margen_anterior_pct, precio_venta_sugerido, precio_venta_decidido, incluir_en_aplicacion, producto_id')
    .eq('lista_id', id)
    .not('producto_id', 'is', null)
    .order('orden');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lista, items: items ?? [] });
}

// ---------------------------------------------------------------------------
// PATCH /api/analizador/listas/[id]/simular — Save decided prices
// ---------------------------------------------------------------------------

interface PrecioDecidido {
  item_id: string;
  precio_venta_decidido: number | null;
  incluir_en_aplicacion?: boolean;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await moduloGuard('analizador_rentabilidad');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const forbidden = rejectIfVisor(session.rol);
  if (forbidden) return forbidden;

  const { id } = await params;

  const { data: lista } = await session.supabase
    .from('lista_precios')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (!lista) {
    return NextResponse.json({ error: 'Lista no encontrada' }, { status: 404 });
  }

  let body: { items: PrecioDecidido[] };
  try {
    body = (await request.json()) as { items: PrecioDecidido[] };
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'Se requiere un array de items' }, { status: 400 });
  }

  let updated = 0;

  for (const entry of body.items) {
    const updateData: Record<string, unknown> = {};

    if (entry.precio_venta_decidido !== undefined) {
      updateData.precio_venta_decidido = entry.precio_venta_decidido;
    }
    if (entry.incluir_en_aplicacion !== undefined) {
      updateData.incluir_en_aplicacion = entry.incluir_en_aplicacion;
    }

    if (Object.keys(updateData).length === 0) continue;

    const { error } = await session.supabase
      .from('lista_precios_item')
      .update(updateData)
      .eq('id', entry.item_id)
      .eq('lista_id', id);

    if (!error) updated++;
  }

  return NextResponse.json({ updated });
}
