import type { SupabaseClient } from '@supabase/supabase-js';

import { sugerirPrecioVenta } from '@/lib/ia/sugerir-margen';
import type { Database } from '@/types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ListaPreciosItem = Database['public']['Tables']['lista_precios_item']['Row'];

interface ProductoInfo {
  id: string;
  precio_costo: number;
  precio_venta: number;
  categoria_id: string | null;
}

interface ItemAnalizado extends ListaPreciosItem {
  categoria_nombre: string | null;
}

interface ImpactoCategoria {
  categoria_id: string | null;
  categoria_nombre: string;
  items: number;
  variacion_promedio_pct: number;
  items_con_aumento: number;
  items_con_baja: number;
  items_sin_cambio: number;
}

export interface AnalisisOutput {
  items_analizados: ItemAnalizado[];
  items_sin_match: ListaPreciosItem[];
  metricas_globales: {
    variacion_promedio_pct: number;
    margen_global_anterior_pct: number;
    margen_global_nuevo_pct: number;
    items_con_aumento: number;
    items_con_baja: number;
    items_sin_cambio: number;
    total_matcheados: number;
    total_sin_match: number;
  };
  impacto_por_categoria: ImpactoCategoria[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calcularMargenPct(costo: number, venta: number): number {
  if (costo <= 0 || venta <= 0) return 0;
  return ((venta - costo) / costo) * 100;
}

function calcularVariacionPct(anterior: number, nuevo: number): number {
  if (anterior <= 0) return nuevo > 0 ? 100 : 0;
  return ((nuevo - anterior) / anterior) * 100;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Public — Run full analysis
// ---------------------------------------------------------------------------

export async function ejecutarAnalisis(
  supabase: SupabaseClient<Database>,
  listaId: string,
): Promise<AnalisisOutput> {
  const { data: items, error: itemsErr } = await supabase
    .from('lista_precios_item')
    .select('*')
    .eq('lista_id', listaId)
    .order('orden');

  if (itemsErr) throw new Error(`Error al cargar items: ${itemsErr.message}`);
  if (!items || items.length === 0) throw new Error('La lista no tiene items');

  const matchedItems = items.filter((i) => i.producto_id != null);
  const unmatchedItems = items.filter((i) => i.producto_id == null);

  if (matchedItems.length === 0) {
    throw new Error('No hay items matcheados para analizar. Ejecutá el matching primero.');
  }

  const productoIds = matchedItems.map((i) => i.producto_id!);
  const { data: productos } = await supabase
    .from('producto')
    .select('id, precio_costo, precio_venta, categoria_id')
    .in('id', productoIds);

  const prodMap = new Map<string, ProductoInfo>();
  for (const p of productos ?? []) {
    prodMap.set(p.id, {
      id: p.id,
      precio_costo: p.precio_costo ?? 0,
      precio_venta: p.precio_venta ?? 0,
      categoria_id: p.categoria_id,
    });
  }

  const categoriaIds = [...new Set(
    (productos ?? []).map((p) => p.categoria_id).filter(Boolean) as string[],
  )];
  const catMap = new Map<string, string>();
  if (categoriaIds.length > 0) {
    const { data: cats } = await supabase
      .from('categoria')
      .select('id, nombre')
      .in('id', categoriaIds);
    for (const c of cats ?? []) catMap.set(c.id, c.nombre);
  }

  // Per-item analysis
  const itemsAnalizados: ItemAnalizado[] = [];
  let sumVariacion = 0;
  let sumCostoAnterior = 0;
  let sumVentaActual = 0;
  let sumCostoNuevo = 0;
  let conAumento = 0;
  let conBaja = 0;
  let sinCambio = 0;

  const categoriaBuckets = new Map<string | null, {
    catNombre: string;
    variaciones: number[];
    aumento: number;
    baja: number;
    sinCambio: number;
  }>();

  for (const item of matchedItems) {
    const prod = prodMap.get(item.producto_id!);
    if (!prod) {
      unmatchedItems.push(item);
      continue;
    }

    const costoAnterior = prod.precio_costo;
    const costoNuevo = item.precio_lista;
    const ventaActual = prod.precio_venta;

    const variacion = calcularVariacionPct(costoAnterior, costoNuevo);
    const margenAnterior = calcularMargenPct(costoAnterior, ventaActual);
    const margenNuevo = calcularMargenPct(costoNuevo, ventaActual);

    const sugerencia = await sugerirPrecioVenta(supabase, prod.id, costoNuevo);

    await supabase
      .from('lista_precios_item')
      .update({
        precio_costo_anterior: round2(costoAnterior),
        variacion_pct: round2(variacion),
        precio_venta_actual: round2(ventaActual),
        margen_anterior_pct: round2(margenAnterior),
        margen_nuevo_pct: round2(margenNuevo),
        precio_venta_sugerido: sugerencia.precioSugerido,
      })
      .eq('id', item.id);

    const catNombre = prod.categoria_id ? catMap.get(prod.categoria_id) ?? 'Sin categoría' : 'Sin categoría';

    itemsAnalizados.push({
      ...item,
      precio_costo_anterior: round2(costoAnterior),
      variacion_pct: round2(variacion),
      precio_venta_actual: round2(ventaActual),
      margen_anterior_pct: round2(margenAnterior),
      margen_nuevo_pct: round2(margenNuevo),
      precio_venta_sugerido: sugerencia.precioSugerido,
      categoria_nombre: catNombre,
    });

    sumVariacion += variacion;
    sumCostoAnterior += costoAnterior;
    sumVentaActual += ventaActual;
    sumCostoNuevo += costoNuevo;

    if (variacion > 0.01) conAumento++;
    else if (variacion < -0.01) conBaja++;
    else sinCambio++;

    const catKey = prod.categoria_id;
    if (!categoriaBuckets.has(catKey)) {
      categoriaBuckets.set(catKey, {
        catNombre,
        variaciones: [],
        aumento: 0,
        baja: 0,
        sinCambio: 0,
      });
    }
    const bucket = categoriaBuckets.get(catKey)!;
    bucket.variaciones.push(variacion);
    if (variacion > 0.01) bucket.aumento++;
    else if (variacion < -0.01) bucket.baja++;
    else bucket.sinCambio++;
  }

  // Global metrics
  const totalMatcheados = itemsAnalizados.length;
  const variacionPromedio = totalMatcheados > 0 ? sumVariacion / totalMatcheados : 0;
  const margenGlobalAnterior = sumCostoAnterior > 0
    ? calcularMargenPct(sumCostoAnterior, sumVentaActual)
    : 0;
  const margenGlobalNuevo = sumCostoNuevo > 0
    ? calcularMargenPct(sumCostoNuevo, sumVentaActual)
    : 0;

  const impactoPorCategoria: ImpactoCategoria[] = [...categoriaBuckets.entries()].map(
    ([catId, b]) => ({
      categoria_id: catId,
      categoria_nombre: b.catNombre,
      items: b.variaciones.length,
      variacion_promedio_pct: round2(
        b.variaciones.reduce((s, v) => s + v, 0) / b.variaciones.length,
      ),
      items_con_aumento: b.aumento,
      items_con_baja: b.baja,
      items_sin_cambio: b.sinCambio,
    }),
  );

  // Update lista_precios with global metrics + change state
  await supabase
    .from('lista_precios')
    .update({
      estado: 'analizada',
      variacion_promedio_pct: round2(variacionPromedio),
      margen_global_anterior_pct: round2(margenGlobalAnterior),
      margen_global_nuevo_pct: round2(margenGlobalNuevo),
      items_con_aumento: conAumento,
      items_con_baja: conBaja,
      items_sin_cambio: sinCambio,
      impacto_por_categoria: impactoPorCategoria as unknown as Database['public']['Tables']['lista_precios']['Update']['impacto_por_categoria'],
    })
    .eq('id', listaId);

  return {
    items_analizados: itemsAnalizados,
    items_sin_match: unmatchedItems,
    metricas_globales: {
      variacion_promedio_pct: round2(variacionPromedio),
      margen_global_anterior_pct: round2(margenGlobalAnterior),
      margen_global_nuevo_pct: round2(margenGlobalNuevo),
      items_con_aumento: conAumento,
      items_con_baja: conBaja,
      items_sin_cambio: sinCambio,
      total_matcheados: totalMatcheados,
      total_sin_match: unmatchedItems.length,
    },
    impacto_por_categoria: impactoPorCategoria,
  };
}
