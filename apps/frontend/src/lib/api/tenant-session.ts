import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

export type RolUsuario = Database['public']['Enums']['rol_usuario'];

export type TenantSession =
  | {
      supabase: Awaited<ReturnType<typeof createServerClient>>;
      userId: string;
      tenantId: string;
      rol: RolUsuario;
    }
  | { error: NextResponse };

export async function getTenantSession(): Promise<TenantSession> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) };
  }

  const { data: usuario, error } = await supabase
    .from('usuario')
    .select('tenant_id, rol')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !usuario) {
    return { error: NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 }) };
  }

  return {
    supabase,
    userId: user.id,
    tenantId: usuario.tenant_id,
    rol: usuario.rol,
  };
}

export function rejectIfVisor(rol: RolUsuario) {
  if (rol === 'visor') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  }
  return null;
}
