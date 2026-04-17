import { NextResponse } from 'next/server';

import { getTenantSession, rejectIfVisor } from '@/lib/api/tenant-session';
import {
  emitirComprobante,
  type EmitirComprobanteBody,
} from '@/lib/facturacion/emitir-comprobante';
import { moduloGuard } from '@/lib/modulos/guard';

export async function POST(request: Request) {
  const guard = await moduloGuard('facturador_simple');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const forbidden = rejectIfVisor(session.rol);
  if (forbidden) return forbidden;

  let body: EmitirComprobanteBody;
  try {
    body = (await request.json()) as EmitirComprobanteBody;
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const result = await emitirComprobante(session.supabase, {
    tenantId: session.tenantId,
    userId: session.userId,
  }, body);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    {
      comprobante: result.data.comprobante,
      importes: result.data.importes,
    },
    { status: 201 },
  );
}
