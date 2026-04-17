import { cache } from 'react';

import { getCachedServerAuth } from '@/lib/supabase/cached-auth';
import type { Database } from '@/types/database';

export type SessionProfile = {
  userDisplayName: string;
  tenantId: string;
  tenantName: string;
  rol: Database['public']['Enums']['rol_usuario'];
  ivaDefault: number;
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
  let ivaDefault = 21;
  if (usuario?.tenant_id) {
    const { data: tenant } = await supabase
      .from('tenant')
      .select('nombre, iva_porcentaje_default')
      .eq('id', usuario.tenant_id)
      .maybeSingle();
    if (tenant?.nombre) tenantName = tenant.nombre;
    if (tenant?.iva_porcentaje_default != null) ivaDefault = tenant.iva_porcentaje_default;
  }

  const userDisplayName = usuario
    ? `${usuario.nombre} ${usuario.apellido}`.trim()
    : (user.email ?? 'Usuario');

  return {
    userDisplayName,
    tenantId: usuario?.tenant_id ?? '',
    tenantName,
    rol: usuario?.rol ?? 'visor',
    ivaDefault,
  };
});
