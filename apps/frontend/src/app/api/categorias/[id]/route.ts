import { NextResponse } from 'next/server';

import { getTenantSession, rejectIfVisor } from '@/lib/api/tenant-session';
import { moduloGuard } from '@/lib/modulos/guard';
import type { Database } from '@/types/database';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await moduloGuard('stock');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const forbidden = rejectIfVisor(session.rol);
  if (forbidden) return forbidden;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body === 'object' && body) {
    const b = body as Record<string, unknown>;
    if (typeof b.nombre === 'string') updates.nombre = b.nombre.trim();
    if (b.descripcion !== undefined) {
      updates.descripcion =
        b.descripcion === null || b.descripcion === ''
          ? null
          : String(b.descripcion);
    }
    if (typeof b.activa === 'boolean') updates.activa = b.activa;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Sin cambios' }, { status: 400 });
  }

  const { data, error } = await session.supabase
    .from('categoria')
    .update(updates as Database['public']['Tables']['categoria']['Update'])
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Ya existe una categoría con ese nombre' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });
  }

  return NextResponse.json(data);
}
