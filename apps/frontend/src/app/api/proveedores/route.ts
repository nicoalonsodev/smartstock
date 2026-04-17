import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';

import { getTenantSession, rejectIfVisor } from '@/lib/api/tenant-session';
import { moduloGuard } from '@/lib/modulos/guard';

export async function GET(_request: NextRequest) {
  // #region agent log
  const agentLog = (
    message: string,
    hypothesisId: string,
    data: Record<string, unknown>
  ) => {
    fetch('http://127.0.0.1:7729/ingest/b7d77d9b-b0af-4230-81eb-50c688422230', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'c9181b' },
      body: JSON.stringify({
        sessionId: 'c9181b',
        runId: 'post-fix',
        hypothesisId,
        location: 'api/proveedores/route.ts:GET',
        message,
        data,
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  };
  // #endregion

  try {
    const cookieStore = await cookies();
    const all = cookieStore.getAll();
    const sb = all.filter(
      (c) => c.name.startsWith('sb-') || c.name.toLowerCase().includes('auth')
    );
    // #region agent log
    agentLog('GET entry', 'H1-H2', {
      cookieCount: all.length,
      sbNames: sb.map((c) => c.name),
      sbValueLengths: sb.map((c) => c.value.length),
      emptySbCookieNames: sb.filter((c) => c.value.length === 0).map((c) => c.name),
    });
    // #endregion

    const guard = await moduloGuard('stock');
    if (!guard.allowed) return guard.response;
    // #region agent log
    agentLog('after moduloGuard', 'H2-H4', { allowed: true });
    // #endregion

    const session = await getTenantSession();
    if ('error' in session) return session.error;
    // #region agent log
    agentLog('after getTenantSession', 'H4', { ok: true });
    // #endregion

    const { data, error } = await session.supabase
      .from('proveedor')
      .select('id, nombre, cuit, telefono, email, activo, created_at')
      .order('nombre');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ proveedores: data ?? [] });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    // #region agent log
    agentLog('GET uncaught', 'H1-H4', {
      errName: err.name,
      errMessage: err.message,
      errStackHead: err.stack?.split('\n').slice(0, 4).join(' | '),
    });
    // #endregion
    throw e;
  }
}

export async function POST(request: Request) {
  const guard = await moduloGuard('stock');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const forbidden = rejectIfVisor(session.rol);
  if (forbidden) return forbidden;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const b =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};

  const nombre = String(b.nombre ?? '').trim();
  if (!nombre) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
  }

  const { data, error } = await session.supabase
    .from('proveedor')
    .insert({
      tenant_id: session.tenantId,
      nombre,
      cuit: b.cuit != null ? String(b.cuit).trim() || null : null,
      telefono: b.telefono != null ? String(b.telefono).trim() || null : null,
      email: b.email != null ? String(b.email).trim() || null : null,
      direccion: b.direccion != null ? String(b.direccion).trim() || null : null,
      notas: b.notas != null ? String(b.notas).trim() || null : null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
