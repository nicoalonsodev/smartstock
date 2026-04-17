import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

/**
 * Suma cantidades en pedidos `confirmado` por producto (tenant vía RLS).
 */
export async function obtenerStockComprometidoPorProducto(
  supabase: SupabaseClient<Database>,
  productoIds: string[],
  opciones?: { excluirPedidoId?: string }
): Promise<Map<string, number>> {
  const mapa = new Map<string, number>();
  if (productoIds.length === 0) return mapa;

  let pedidosQ = supabase.from('pedido').select('id').eq('estado', 'confirmado');
  if (opciones?.excluirPedidoId) {
    pedidosQ = pedidosQ.neq('id', opciones.excluirPedidoId);
  }
  const { data: pedidos, error: pedErr } = await pedidosQ;
  if (pedErr || !pedidos?.length) return mapa;

  const pedidoIds = pedidos.map((p) => p.id);
  const { data: items, error: itemErr } = await supabase
    .from('pedido_item')
    .select('producto_id, cantidad')
    .in('pedido_id', pedidoIds)
    .in('producto_id', productoIds);

  if (itemErr || !items) return mapa;

  for (const row of items) {
    const prev = mapa.get(row.producto_id) ?? 0;
    mapa.set(row.producto_id, prev + row.cantidad);
  }

  return mapa;
}
