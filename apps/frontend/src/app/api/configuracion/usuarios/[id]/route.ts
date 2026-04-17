import { NextResponse } from 'next/server';

import { getTenantSession, rejectIfVisor } from '@/lib/api/tenant-session';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

type RolUsuario = Database['public']['Enums']['rol_usuario'];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const forbidden = rejectIfVisor(session.rol);
  if (forbidden) return forbidden;

  const { data: me } = await session.supabase
    .from('usuario')
    .select('rol')
    .eq('id', session.userId)
    .maybeSingle();

  if (!me || me.rol !== 'admin') {
    return NextResponse.json({ error: 'Solo el administrador puede editar usuarios' }, { status: 403 });
  }

  const { id: targetId } = await params;

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

  const updates: { rol?: RolUsuario; activo?: boolean } = {};

  if (typeof b.rol === 'string') {
    if (!['admin', 'operador', 'visor'].includes(b.rol)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
    }
    if (targetId === session.userId && b.rol !== 'admin') {
      return NextResponse.json(
        { error: 'No podés quitarte el rol de administrador' },
        { status: 400 },
      );
    }
    updates.rol = b.rol as RolUsuario;
  }

  if (typeof b.activo === 'boolean') {
    if (targetId === session.userId && b.activo === false) {
      return NextResponse.json({ error: 'No podés desactivar tu propia cuenta' }, { status: 400 });
    }
    updates.activo = b.activo;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Sin cambios' }, { status: 400 });
  }

  const admin = createServiceRoleClient();

  const { data: target, error: findErr } = await admin
    .from('usuario')
    .select('id, tenant_id')
    .eq('id', targetId)
    .maybeSingle();

  if (findErr || !target || target.tenant_id !== session.tenantId) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }

  const { data: updated, error: upErr } = await admin
    .from('usuario')
    .update(updates)
    .eq('id', targetId)
    .eq('tenant_id', session.tenantId)
    .select()
    .single();

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json(updated);
}
