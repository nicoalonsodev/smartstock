import { NextResponse } from 'next/server';

import { obtenerDashboardRentabilidad } from '@/lib/analizador/cierre-mensual';
import { getTenantSession } from '@/lib/api/tenant-session';
import { moduloGuard } from '@/lib/modulos/guard';

export async function GET() {
  const guard = await moduloGuard('analizador_rentabilidad');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  try {
    const data = await obtenerDashboardRentabilidad(
      session.supabase,
      session.tenantId,
    );
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
