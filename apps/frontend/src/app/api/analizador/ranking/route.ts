import { NextResponse } from 'next/server';

import { calcularRankingBCG } from '@/lib/analizador/ranking-bcg';
import { getTenantSession } from '@/lib/api/tenant-session';
import { moduloGuard } from '@/lib/modulos/guard';

export async function GET(request: Request) {
  const guard = await moduloGuard('analizador_rentabilidad');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const url = new URL(request.url);
  const categoria_id = url.searchParams.get('categoria_id') ?? undefined;
  const desde = url.searchParams.get('desde') ?? undefined;
  const hasta = url.searchParams.get('hasta') ?? undefined;

  try {
    const result = await calcularRankingBCG(session.supabase, {
      categoria_id,
      desde,
      hasta,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
