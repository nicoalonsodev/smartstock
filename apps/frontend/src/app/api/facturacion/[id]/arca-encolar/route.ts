import { NextResponse } from 'next/server';

import { encolarComprobanteArca } from '@/lib/arca/encolar-comprobante-arca';
import { getTenantSession, rejectIfVisor } from '@/lib/api/tenant-session';
import { moduloGuard } from '@/lib/modulos/guard';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const mod = await moduloGuard('facturador_arca');
  if (!mod.allowed) return mod.response;

  const simple = await moduloGuard('facturador_simple');
  if (!simple.allowed) return simple.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const forbidden = rejectIfVisor(session.rol);
  if (forbidden) return forbidden;

  const { id } = await params;

  const result = await encolarComprobanteArca(session.supabase, { tenantId: session.tenantId }, id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    { job_id: result.jobId, mensaje: result.mensaje },
    { status: 202 },
  );
}
