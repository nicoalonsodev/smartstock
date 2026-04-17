import { NextResponse } from 'next/server';

import { getTenantSession, rejectIfVisor } from '@/lib/api/tenant-session';
import {
  ejecutarImportacionFilas,
  type EjecutarImportacionParams,
} from '@/lib/importar/ejecutar-importacion';
import { moduloGuard } from '@/lib/modulos/guard';

export async function POST(request: Request) {
  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const forbidden = rejectIfVisor(session.rol);
  if (forbidden) return forbidden;

  let body: EjecutarImportacionParams;
  try {
    body = (await request.json()) as EjecutarImportacionParams;
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const origen = body.origen ?? 'importacion_excel';
  const modulo = origen === 'ia_pdf' ? 'ia_precios' : 'importador_excel';
  const guard = await moduloGuard(modulo);
  if (!guard.allowed) return guard.response;

  if (!body.filas || body.filas.length === 0) {
    return NextResponse.json({ error: 'No hay filas para importar' }, { status: 400 });
  }

  const resultado = await ejecutarImportacionFilas(
    session.supabase,
    { tenantId: session.tenantId, userId: session.userId },
    body,
  );

  return NextResponse.json(resultado);
}
