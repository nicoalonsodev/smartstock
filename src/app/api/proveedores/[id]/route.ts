import { NextResponse } from 'next/server';

import { getTenantSession, rejectIfVisor } from '@/lib/api/tenant-session';
import { moduloGuard } from '@/lib/modulos/guard';
import type { Database } from '@/types/database';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await moduloGuard('stock');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const { id } = await params;

  const { data, error } = await session.supabase
    .from('proveedor')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });
  }

  return NextResponse.json(data);
}

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

  const b =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};

  const updates: Record<string, unknown> = {};
  const str = (v: unknown) =>
    v === null || v === undefined ? null : String(v).trim() || null;

  if (b.nombre !== undefined) updates.nombre = String(b.nombre ?? '').trim();
  if (b.cuit !== undefined) updates.cuit = str(b.cuit);
  if (b.telefono !== undefined) updates.telefono = str(b.telefono);
  if (b.email !== undefined) updates.email = str(b.email);
  if (b.direccion !== undefined) updates.direccion = str(b.direccion);
  if (b.notas !== undefined) updates.notas = str(b.notas);
  if (typeof b.activo === 'boolean') updates.activo = b.activo;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Sin cambios' }, { status: 400 });
  }

  if (updates.nombre === '') {
    return NextResponse.json({ error: 'El nombre no puede estar vacío' }, { status: 400 });
  }

  const { data, error } = await session.supabase
    .from('proveedor')
    .update(updates as Database['public']['Tables']['proveedor']['Update'])
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });
  }

  return NextResponse.json(data);
}
