import { getTenantSession } from '@/lib/api/tenant-session';
import { verificarLimiteIA } from '@/lib/ia/limite';
import { moduloGuard } from '@/lib/modulos/guard';
import { NextResponse } from 'next/server';

export async function GET() {
  const guard = await moduloGuard('ia_precios');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  try {
    const { permitido, usadas, limite } = await verificarLimiteIA(session.supabase);
    return NextResponse.json({ permitido, usadas, limite });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
