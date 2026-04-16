import { NextResponse } from 'next/server';

import { ejecutarAnalisis } from '@/lib/analizador/analisis';
import { getTenantSession, rejectIfVisor } from '@/lib/api/tenant-session';
import { moduloGuard } from '@/lib/modulos/guard';

export async function POST(
  _request: Request,
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

  try {
    const resultado = await ejecutarAnalisis(session.supabase, id);
    return NextResponse.json(resultado);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || 'Error al ejecutar análisis' },
      { status: 500 },
    );
  }
}
