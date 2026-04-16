import { cache } from 'react';

import { getCachedServerAuth } from '@/lib/supabase/cached-auth';
import type { Database } from '@/types/database';

export type SessionProfile = {
  userDisplayName: string;
  tenantName: string;
  rol: Database['public']['Enums']['rol_usuario'];
};

export const getSessionProfile = cache(async (): Promise<SessionProfile | null> => {
  const { supabase, user } = await getCachedServerAuth();
  if (!user) return null;

  const { data: usuario } = await supabase
    .from('usuario')
    .select('nombre, apellido, tenant_id, rol')
    .eq('id', user.id)
    .maybeSingle();

  let tenantName = 'Tu negocio';
  if (usuario?.tenant_id) {
    const { data: tenant } = await supabase
      .from('tenant')
      .select('nombre')
      .eq('id', usuario.tenant_id)
      .maybeSingle();
    if (tenant?.nombre) tenantName = tenant.nombre;
  }

  const userDisplayName = usuario
    ? `${usuario.nombre} ${usuario.apellido}`.trim()
    : (user.email ?? 'Usuario');

  return {
    userDisplayName,
    tenantName,
    rol: usuario?.rol ?? 'visor',
  };
});
