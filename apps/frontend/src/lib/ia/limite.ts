import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

export function limiteMensualIA(): number {
  const raw = process.env.IA_EXTRACCIONES_LIMITE_MENSUAL;
  const n = raw != null && raw !== '' ? parseInt(raw, 10) : 50;
  return Number.isFinite(n) && n > 0 ? n : 50;
}

/**
 * Cuenta importaciones con origen IA del mes calendario actual (tenant vía RLS).
 */
export async function verificarLimiteIA(
  supabase: SupabaseClient<Database>,
): Promise<{
  permitido: boolean;
  usadas: number;
  limite: number;
}> {
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from('importacion_log')
    .select('*', { count: 'exact', head: true })
    .eq('origen', 'ia_pdf')
    .like('archivo_nombre', '[IA extracción]%')
    .gte('created_at', inicioMes.toISOString());

  if (error) {
    throw new Error(error.message);
  }

  const limite = limiteMensualIA();
  const usadas = count ?? 0;

  return {
    permitido: usadas < limite,
    usadas,
    limite,
  };
}
