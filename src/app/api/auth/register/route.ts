import { createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseBody(body: unknown): Record<string, unknown> | null {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    return body as Record<string, unknown>;
  }
  return null;
}

function validate(body: Record<string, unknown>) {
  const negocio = String(body.negocio ?? '').trim();
  const nombre = String(body.nombre ?? '').trim();
  const apellido = String(body.apellido ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');

  if (!negocio) return { error: 'El nombre del negocio es obligatorio.' };
  if (!nombre) return { error: 'El nombre es obligatorio.' };
  if (!apellido) return { error: 'El apellido es obligatorio.' };
  if (!email || !EMAIL_RE.test(email)) {
    return { error: 'Ingresá un correo electrónico válido.' };
  }
  if (password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres.' };
  }

  return { negocio, nombre, apellido, email, password };
}

function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (
    m.includes('already registered') ||
    m.includes('already been registered') ||
    m.includes('user already exists')
  ) {
    return 'Ese correo ya está registrado.';
  }
  return message;
}

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido.' }, { status: 400 });
  }

  const body = parseBody(raw);
  if (!body) {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido.' }, { status: 400 });
  }

  const parsed = validate(body);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { negocio, nombre, apellido, email, password } = parsed;
  const supabase = createServiceRoleClient();

  let authUserId: string | null = null;
  let tenantId: string | null = null;

  try {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      throw new Error(mapAuthError(authError.message));
    }
    if (!authData.user?.id) {
      throw new Error('No se pudo crear el usuario.');
    }
    authUserId = authData.user.id;

    const { data: tenant, error: tenantError } = await supabase
      .from('tenant')
      .insert({ nombre: negocio, plan: 'base' })
      .select('id')
      .single();

    if (tenantError) {
      throw new Error(`No se pudo crear el negocio: ${tenantError.message}`);
    }
    tenantId = tenant.id;

    const { error: moduloError } = await supabase.from('modulo_config').insert({
      tenant_id: tenantId,
      stock: true,
      importador_excel: true,
      facturador_simple: true,
      facturador_arca: false,
      pedidos: false,
      presupuestos: false,
      ia_precios: false,
    });

    if (moduloError) {
      throw new Error(`No se pudo configurar los módulos: ${moduloError.message}`);
    }

    const { error: userError } = await supabase.from('usuario').insert({
      id: authUserId,
      tenant_id: tenantId,
      nombre,
      apellido,
      email,
      rol: 'admin',
    });

    if (userError) {
      throw new Error(`No se pudo crear el perfil: ${userError.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (tenantId) {
      await supabase.from('tenant').delete().eq('id', tenantId);
    }
    if (authUserId) {
      await supabase.auth.admin.deleteUser(authUserId);
    }

    const message = err instanceof Error ? err.message : 'Error al registrar.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
