import { NextResponse, type NextRequest } from 'next/server';

import { getTenantSession, rejectIfVisor } from '@/lib/api/tenant-session';
import { moduloGuard } from '@/lib/modulos/guard';
import type { Database } from '@/types/database';

type CondicionIva = Database['public']['Enums']['condicion_iva'];

export async function GET(request: NextRequest) {
  const guard = await moduloGuard('facturador_simple');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';

  let query = session.supabase
    .from('cliente')
    .select('id, nombre, razon_social, cuit_dni, condicion_iva, telefono, email, activo, created_at')
    .order('nombre');

  if (q) {
    query = query.or(`nombre.ilike.%${q}%,cuit_dni.ilike.%${q}%,razon_social.ilike.%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ clientes: data ?? [] });
}

export async function POST(request: Request) {
  const guard = await moduloGuard('facturador_simple');
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

  const str = (v: unknown) =>
    v === null || v === undefined ? null : String(v).trim() || null;

  const { data, error } = await session.supabase
    .from('cliente')
    .insert({
      tenant_id: session.tenantId,
      nombre,
      razon_social: str(b.razon_social),
      cuit_dni: str(b.cuit_dni),
      condicion_iva: b.condicion_iva != null ? (b.condicion_iva as CondicionIva) : null,
      direccion: str(b.direccion),
      telefono: str(b.telefono),
      email: str(b.email),
      notas: str(b.notas),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
