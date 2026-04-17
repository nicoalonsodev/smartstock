import { NextResponse } from 'next/server';

import { calcularForecast } from '@/lib/analizador/forecast-reposicion';
import { getTenantSession } from '@/lib/api/tenant-session';
import { moduloGuard } from '@/lib/modulos/guard';

export async function GET(request: Request) {
  const guard = await moduloGuard('analizador_rentabilidad');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const url = new URL(request.url);
  const categoria_id = url.searchParams.get('categoria_id') ?? undefined;
  const proveedor_id = url.searchParams.get('proveedor_id') ?? undefined;

  try {
    const result = await calcularForecast(session.supabase, {
      categoria_id,
      proveedor_id,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
