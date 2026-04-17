import { NextResponse } from 'next/server';

import { getTenantSession, rejectIfVisor } from '@/lib/api/tenant-session';
import { moduloGuard } from '@/lib/modulos/guard';

export async function GET() {
  const guard = await moduloGuard('stock');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const { data, error } = await session.supabase
    .from('proveedor')
    .select('id, nombre, cuit, telefono, email, activo, created_at')
    .order('nombre');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ proveedores: data ?? [] });
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
