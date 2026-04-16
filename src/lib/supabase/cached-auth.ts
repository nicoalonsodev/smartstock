import { cache } from 'react';

import { createServerClient } from '@/lib/supabase/server';

/**
 * Una sola validación de sesión por request de React (layouts/páginas servidor).
 * Usa getUser() (validado con Auth), no getSession() desde cookie, para evitar
 * fallos de parseo y el warning de seguridad de Supabase en rutas compuestas.
 */
export const getCachedServerAuth = cache(async () => {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { supabase, user: user ?? null, authError: error };
});
