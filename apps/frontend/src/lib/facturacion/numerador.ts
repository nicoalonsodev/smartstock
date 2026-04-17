import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Obtiene el siguiente número de comprobante para un tenant y tipo dado.
 * Debe llamarse dentro de la misma transacción que inserta el comprobante.
 * El índice UNIQUE previene duplicados bajo concurrencia.
 */
export async function obtenerSiguienteNumero(
  supabase: SupabaseClient,
  tenantId: string,
  tipo: string,
): Promise<number> {
  const { data, error } = await supabase.rpc('siguiente_numero_comprobante', {
    p_tenant_id: tenantId,
    p_tipo: tipo,
  });

  if (error) throw new Error(`Error al obtener número: ${error.message}`);
  return data as number;
}
