import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AplicarListaParams {
  tenantId: string;
  userId: string;
  parcial?: boolean;
  contribuirRadar?: boolean;
}

export interface AplicarListaResult {
  actualizados: number;
  omitidos: number;
  errores: { item_id: string; nombre: string; error: string }[];
  estado_lista: 'aplicada_total' | 'aplicada_parcial';
}

// ---------------------------------------------------------------------------
// Public — Apply list to catalog
// ---------------------------------------------------------------------------

export async function aplicarLista(
  supabase: SupabaseClient<Database>,
  listaId: string,
  params: AplicarListaParams,
): Promise<AplicarListaResult> {
  const { data: lista } = await supabase
    .from('lista_precios')
    .select('id, proveedor_id, variacion_promedio_pct, total_items')
    .eq('id', listaId)
    .single();

  if (!lista) throw new Error('Lista no encontrada');

  const { data: items } = await supabase
    .from('lista_precios_item')
    .select('*')
    .eq('lista_id', listaId)
    .not('producto_id', 'is', null)
    .order('orden');

  if (!items || items.length === 0) {
    throw new Error('No hay items matcheados para aplicar');
  }

  const itemsAplicar = items.filter((i) => i.incluir_en_aplicacion);
  const itemsOmitidos = items.length - itemsAplicar.length;

  let actualizados = 0;
  const errores: AplicarListaResult['errores'] = [];

  for (const item of itemsAplicar) {
    try {
      const nuevoCosto = item.precio_lista;
      const nuevaVenta = item.precio_venta_decidido
        ?? item.precio_venta_sugerido
        ?? null;

      // Update producto.precio_costo (and optionally precio_venta)
      const prodUpdate: Record<string, unknown> = {
        precio_costo: nuevoCosto,
      };
      if (nuevaVenta != null) {
        prodUpdate.precio_venta = nuevaVenta;
      }

      const { error: prodErr } = await supabase
        .from('producto')
        .update(prodUpdate)
        .eq('id', item.producto_id!);

      if (prodErr) {
        errores.push({ item_id: item.id, nombre: item.nombre_raw, error: prodErr.message });
        continue;
      }

      // Insert precio_historial
      const { error: histErr } = await supabase.from('precio_historial').insert({
        tenant_id: params.tenantId,
        producto_id: item.producto_id!,
        precio_costo: nuevoCosto,
        precio_venta: nuevaVenta ?? item.precio_venta_actual ?? 0,
        origen: 'lista_precios',
        usuario_id: params.userId,
        notas: `Lista: ${listaId}`,
      });

      if (histErr) {
        console.error('[aplicar-lista] precio_historial:', histErr.message);
      }

      // Upsert producto_proveedor
      const { error: ppErr } = await supabase
        .from('producto_proveedor')
        .upsert(
          {
            tenant_id: params.tenantId,
            producto_id: item.producto_id!,
            proveedor_id: lista.proveedor_id,
            precio_costo: nuevoCosto,
            codigo_proveedor: item.codigo_proveedor,
          },
          { onConflict: 'tenant_id,producto_id,proveedor_id' },
        );

      if (ppErr) {
        console.error('[aplicar-lista] producto_proveedor:', ppErr.message);
      }

      actualizados++;
    } catch (e) {
      errores.push({ item_id: item.id, nombre: item.nombre_raw, error: (e as Error).message });
    }
  }

  // Contribute to radar if opted in
  if (params.contribuirRadar && lista.variacion_promedio_pct != null) {
    const { data: proveedor } = await supabase
      .from('proveedor')
      .select('nombre')
      .eq('id', lista.proveedor_id)
      .single();

    if (proveedor) {
      const periodo = new Date().toISOString().slice(0, 7);
      await supabase.rpc('contribuir_radar', {
        p_rubro: 'general',
        p_proveedor_nombre: proveedor.nombre,
        p_periodo: periodo,
        p_variacion_pct: lista.variacion_promedio_pct,
        p_cantidad_items: lista.total_items,
      });
    }
  }

  // Determine final state
  const esParcial = params.parcial || itemsOmitidos > 0 || errores.length > 0;
  const estadoLista = esParcial ? 'aplicada_parcial' : 'aplicada_total';

  await supabase
    .from('lista_precios')
    .update({ estado: estadoLista })
    .eq('id', listaId);

  return {
    actualizados,
    omitidos: itemsOmitidos,
    errores,
    estado_lista: estadoLista,
  };
}
