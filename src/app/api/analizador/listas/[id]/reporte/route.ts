import { NextResponse } from 'next/server';

import { LimiteIAError } from '@/lib/analizador/extraer-lista';
import { generarReporteEjecutivo } from '@/lib/analizador/reporte-ia';
import { getTenantSession, rejectIfVisor } from '@/lib/api/tenant-session';
import { GeminiError } from '@/lib/ia/gemini';
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
    .select('id, estado')
    .eq('id', id)
    .maybeSingle();

  if (!lista) {
    return NextResponse.json({ error: 'Lista no encontrada' }, { status: 404 });
  }

  if (lista.estado === 'pendiente') {
    return NextResponse.json(
      { error: 'La lista debe estar analizada antes de generar el reporte. Ejecutá el análisis primero.' },
      { status: 400 },
    );
  }

  try {
    const reporte = await generarReporteEjecutivo(
      session.supabase,
      id,
      { tenantId: session.tenantId, userId: session.userId },
    );
    return NextResponse.json({ reporte });
  } catch (err) {
    if (err instanceof LimiteIAError) {
      return NextResponse.json(
        { error: err.message, usadas: err.usadas, limite: err.limite },
        { status: 429 },
      );
    }
    if (err instanceof GeminiError) {
      if (err.code === 'config' || err.code === 'api_key') {
        return NextResponse.json({ error: err.message }, { status: 503 });
      }
      if (err.code === 'timeout') {
        return NextResponse.json({ error: err.message }, { status: 504 });
      }
      return NextResponse.json({ error: `Error de IA: ${err.message}` }, { status: 502 });
    }
    return NextResponse.json(
      { error: (err as Error).message || 'Error al generar reporte' },
      { status: 500 },
    );
  }
}
