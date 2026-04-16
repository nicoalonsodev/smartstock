import { NextResponse } from 'next/server';

import { calcularMargenReal } from '@/lib/analizador/margen-real';
import { getTenantSession } from '@/lib/api/tenant-session';
import { moduloGuard } from '@/lib/modulos/guard';

export async function GET(request: Request) {
  const guard = await moduloGuard('analizador_rentabilidad');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const url = new URL(request.url);
  const producto_id = url.searchParams.get('producto_id') ?? undefined;
  const categoria_id = url.searchParams.get('categoria_id') ?? undefined;
  const desde = url.searchParams.get('desde') ?? undefined;
  const hasta = url.searchParams.get('hasta') ?? undefined;

  try {
    const result = await calcularMargenReal(session.supabase, {
      producto_id,
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
