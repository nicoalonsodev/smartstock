import { redirect } from 'next/navigation';

import { createServerClient } from '@/lib/supabase/server';

import type { ModuloKey } from './modulo-key';

export async function requireModulo(modulo: ModuloKey) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: config } = await supabase.from('modulo_config').select(modulo).single();

  if (!config || !(config as Record<string, boolean>)[modulo]) {
    redirect('/');
  }
}
