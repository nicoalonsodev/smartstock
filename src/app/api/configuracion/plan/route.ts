import { NextResponse } from 'next/server';

import { getTenantSession, rejectIfVisor } from '@/lib/api/tenant-session';
import type { Database } from '@/types/database';

export async function GET() {
  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const [{ data: tenant, error: tenantErr }, { data: modulos, error: modErr }] = await Promise.all([
    session.supabase.from('tenant').select('plan').eq('id', session.tenantId).maybeSingle(),
    session.supabase
      .from('modulo_config')
      .select(
        'stock, importador_excel, facturador_simple, facturador_arca, pedidos, presupuestos, ia_precios, analizador_rentabilidad',
      )
      .eq('tenant_id', session.tenantId)
      .maybeSingle(),
  ]);

  if (tenantErr) {
    return NextResponse.json({ error: tenantErr.message }, { status: 500 });
  }
  if (modErr) {
    return NextResponse.json({ error: modErr.message }, { status: 500 });
  }

  return NextResponse.json({
    plan: tenant?.plan ?? 'base',
    modulos: modulos ?? null,
  });
}

export async function POST(request: Request) {
  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const forbidden = rejectIfVisor(session.rol);
  if (forbidden) return forbidden;

  const { data: usuario } = await session.supabase
    .from('usuario')
    .select('rol')
    .eq('id', session.userId)
    .maybeSingle();

  if (!usuario || usuario.rol !== 'admin') {
    return NextResponse.json({ error: 'Solo el administrador puede cambiar el plan' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const plan =
    typeof body === 'object' &&
    body &&
    'plan' in body &&
    (body as { plan: unknown }).plan === 'base'
      ? 'base'
      : typeof body === 'object' &&
          body &&
          'plan' in body &&
          (body as { plan: unknown }).plan === 'completo'
        ? 'completo'
        : null;

  if (!plan) {
    return NextResponse.json({ error: 'Plan inválido. Usá "base" o "completo".' }, { status: 400 });
  }

  const { error } = await session.supabase.rpc('activar_plan', {
    p_tenant_id: session.tenantId,
    p_plan: plan as Database['public']['Enums']['plan_tipo'],
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, plan });
}
