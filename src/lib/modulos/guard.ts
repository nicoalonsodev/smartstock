import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

import type { ModuloKey } from './modulo-key';

export async function moduloGuard(modulo: ModuloKey) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      allowed: false as const,
      response: NextResponse.json({ error: 'No autenticado' }, { status: 401 }),
    };
  }

  const { data: config } = await supabase
    .from('modulo_config')
    .select(modulo)
    .maybeSingle();

  if (!config || !(config as Record<string, boolean>)[modulo]) {
    return {
      allowed: false as const,
      response: NextResponse.json(
        { error: `El módulo '${modulo}' no está habilitado para tu plan.` },
        { status: 403 },
      ),
    };
  }

  return { allowed: true as const, response: null };
}
