import { redirect } from 'next/navigation';

import { getCachedServerAuth } from '@/lib/supabase/cached-auth';

import type { ModuloKey } from './modulo-key';

export async function requireModulo(modulo: ModuloKey) {
  const { supabase, user } = await getCachedServerAuth();
  if (!user) redirect('/login');

  const { data: config } = await supabase.from('modulo_config').select(modulo).single();

  if (!config || !(config as Record<string, boolean>)[modulo]) {
    redirect('/');
  }
}
