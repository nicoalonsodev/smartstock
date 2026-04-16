import { NextResponse } from 'next/server';

import { aplicarLista } from '@/lib/analizador/aplicar-lista';
import { getTenantSession, rejectIfVisor } from '@/lib/api/tenant-session';
import { moduloGuard } from '@/lib/modulos/guard';

export async function POST(
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
    .select('id, estado')
    .eq('id', id)
    .maybeSingle();

  if (!lista) {
    return NextResponse.json({ error: 'Lista no encontrada' }, { status: 404 });
  }

  if (lista.estado === 'pendiente') {
    return NextResponse.json(
      { error: 'La lista debe estar analizada antes de aplicarla.' },
      { status: 400 },
    );
  }

  let body: { parcial?: boolean; contribuir_radar?: boolean } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // body is optional
  }

  try {
    const resultado = await aplicarLista(session.supabase, id, {
      tenantId: session.tenantId,
      userId: session.userId,
      parcial: body.parcial,
      contribuirRadar: body.contribuir_radar,
    });

    return NextResponse.json(resultado);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || 'Error al aplicar la lista' },
      { status: 500 },
    );
  }
}
