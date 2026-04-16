import { NextResponse } from 'next/server';

import { obtenerRadar } from '@/lib/analizador/alertas-oportunidad';
import { getTenantSession } from '@/lib/api/tenant-session';
import { moduloGuard } from '@/lib/modulos/guard';

export async function GET(request: Request) {
  const guard = await moduloGuard('analizador_rentabilidad');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  // Check opt-in to radar
  const { data: config } = await session.supabase
    .from('modulo_config')
    .select('analizador_rentabilidad')
    .maybeSingle();

  if (!config?.analizador_rentabilidad) {
    return NextResponse.json(
      { error: 'El radar requiere el módulo analizador_rentabilidad activo' },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const periodo = url.searchParams.get('periodo') ?? undefined;
  const rubro = url.searchParams.get('rubro') ?? undefined;

  try {
    const result = await obtenerRadar(session.supabase, { periodo, rubro });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
