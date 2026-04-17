import { NextResponse } from 'next/server';

import { getTenantSession, rejectIfVisor } from '@/lib/api/tenant-session';
import { moduloGuard } from '@/lib/modulos/guard';

export async function GET() {
  const guard = await moduloGuard('stock');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const { data, error } = await session.supabase
    .from('categoria')
    .select('*')
    .order('nombre');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ categorias: data ?? [] });
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

  const nombre = typeof body === 'object' && body && 'nombre' in body
    ? String((body as { nombre: unknown }).nombre ?? '').trim()
    : '';
  const descripcion =
    typeof body === 'object' && body && 'descripcion' in body
      ? String((body as { descripcion: unknown }).descripcion ?? '').trim() || null
      : null;

  if (!nombre) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
  }

  const { data, error } = await session.supabase
    .from('categoria')
    .insert({
      tenant_id: session.tenantId,
      nombre,
      descripcion,
    })
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

  return NextResponse.json(data, { status: 201 });
}
