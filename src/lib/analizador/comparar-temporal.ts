import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ListaResumen {
  id: string;
  fecha_recepcion: string;
  nombre_archivo: string;
  variacion_promedio_pct: number | null;
  total_items: number;
  items_con_aumento: number;
}

interface ProductoEvolucion {
  producto_id: string;
  producto_nombre: string;
  puntos: {
    lista_id: string;
    fecha: string;
    precio_lista: number;
    variacion_pct: number | null;
  }[];
  aumento_acumulado_pct: number;
  es_inflacionario: boolean;
  es_estable: boolean;
}

export interface ComparacionTemporalOutput {
  proveedor_id: string;
  proveedor_nombre: string;
  listas: ListaResumen[];
  dias_promedio_entre_listas: number | null;
  aumento_acumulado_pct: number;
  aumento_promedio_por_lista_pct: number;
  productos_inflacionarios: ProductoEvolucion[];
  productos_estables: ProductoEvolucion[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function diasEntre(a: string, b: string): number {
  return Math.abs(
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24),
  );
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

export async function compararTemporal(
  supabase: SupabaseClient<Database>,
  proveedorId: string,
): Promise<ComparacionTemporalOutput> {
  const { data: proveedor } = await supabase
    .from('proveedor')
    .select('id, nombre')
    .eq('id', proveedorId)
    .single();

  if (!proveedor) throw new Error('Proveedor no encontrado');

  const { data: listas } = await supabase
    .from('lista_precios')
    .select('id, fecha_recepcion, nombre_archivo, variacion_promedio_pct, total_items, items_con_aumento')
    .eq('proveedor_id', proveedorId)
    .in('estado', ['analizada', 'aplicada_total', 'aplicada_parcial'])
    .order('fecha_recepcion', { ascending: true });

  if (!listas || listas.length < 2) {
    throw new Error('Se necesitan al menos 2 listas analizadas del mismo proveedor para comparar');
  }

  const listasResumen: ListaResumen[] = listas.map((l) => ({
    id: l.id,
    fecha_recepcion: l.fecha_recepcion,
    nombre_archivo: l.nombre_archivo,
    variacion_promedio_pct: l.variacion_promedio_pct,
    total_items: l.total_items,
    items_con_aumento: l.items_con_aumento,
  }));

  // Days between lists
  const intervalos: number[] = [];
  for (let i = 1; i < listas.length; i++) {
    intervalos.push(diasEntre(listas[i - 1].fecha_recepcion, listas[i].fecha_recepcion));
  }
  const diasPromedio = intervalos.length > 0
    ? Math.round(intervalos.reduce((s, d) => s + d, 0) / intervalos.length)
    : null;

  // Cumulative and average increase
  const variaciones = listas
    .map((l) => l.variacion_promedio_pct)
    .filter((v): v is number => v != null);

  const aumentoAcumulado = variaciones.length > 0
    ? variaciones.reduce((acc, v) => acc * (1 + v / 100), 1) * 100 - 100
    : 0;

  const aumentoPromedio = variaciones.length > 0
    ? variaciones.reduce((s, v) => s + v, 0) / variaciones.length
    : 0;

  // Product-level evolution across lists
  const listaIds = listas.map((l) => l.id);
  const { data: allItems } = await supabase
    .from('lista_precios_item')
    .select('lista_id, producto_id, precio_lista, variacion_pct')
    .in('lista_id', listaIds)
    .not('producto_id', 'is', null)
    .order('lista_id');

  // Get product names
  const productoIds = [...new Set((allItems ?? []).map((i) => i.producto_id!))];
  const nombreMap = new Map<string, string>();
  if (productoIds.length > 0) {
    const { data: prods } = await supabase
      .from('producto')
      .select('id, nombre')
      .in('id', productoIds);
    for (const p of prods ?? []) nombreMap.set(p.id, p.nombre);
  }

  // Build date index by lista_id
  const fechaMap = new Map(listas.map((l) => [l.id, l.fecha_recepcion]));

  // Group items by producto_id
  const productoItems = new Map<string, { lista_id: string; fecha: string; precio_lista: number; variacion_pct: number | null }[]>();
  for (const item of allItems ?? []) {
    const pid = item.producto_id!;
    if (!productoItems.has(pid)) productoItems.set(pid, []);
    productoItems.get(pid)!.push({
      lista_id: item.lista_id,
      fecha: fechaMap.get(item.lista_id) ?? '',
      precio_lista: item.precio_lista,
      variacion_pct: item.variacion_pct,
    });
  }

  // Classify products (only those appearing in 2+ lists)
  const UMBRAL_INFLACIONARIO = 5;
  const UMBRAL_ESTABLE = 2;

  const inflacionarios: ProductoEvolucion[] = [];
  const estables: ProductoEvolucion[] = [];

  for (const [pid, puntos] of productoItems) {
    if (puntos.length < 2) continue;

    puntos.sort((a, b) => a.fecha.localeCompare(b.fecha));

    const primerPrecio = puntos[0].precio_lista;
    const ultimoPrecio = puntos[puntos.length - 1].precio_lista;
    const acumulado = primerPrecio > 0
      ? ((ultimoPrecio - primerPrecio) / primerPrecio) * 100
      : 0;

    const avgVar = puntos
      .map((p) => p.variacion_pct)
      .filter((v): v is number => v != null);
    const promVar = avgVar.length > 0
      ? avgVar.reduce((s, v) => s + v, 0) / avgVar.length
      : 0;

    const esInflacionario = promVar > UMBRAL_INFLACIONARIO;
    const esEstable = Math.abs(promVar) <= UMBRAL_ESTABLE;

    const evo: ProductoEvolucion = {
      producto_id: pid,
      producto_nombre: nombreMap.get(pid) ?? pid,
      puntos,
      aumento_acumulado_pct: Math.round(acumulado * 100) / 100,
      es_inflacionario: esInflacionario,
      es_estable: esEstable,
    };

    if (esInflacionario) inflacionarios.push(evo);
    if (esEstable) estables.push(evo);
  }

  inflacionarios.sort((a, b) => b.aumento_acumulado_pct - a.aumento_acumulado_pct);
  estables.sort((a, b) => a.aumento_acumulado_pct - b.aumento_acumulado_pct);

  return {
    proveedor_id: proveedor.id,
    proveedor_nombre: proveedor.nombre,
    listas: listasResumen,
    dias_promedio_entre_listas: diasPromedio,
    aumento_acumulado_pct: Math.round(aumentoAcumulado * 100) / 100,
    aumento_promedio_por_lista_pct: Math.round(aumentoPromedio * 100) / 100,
    productos_inflacionarios: inflacionarios.slice(0, 20),
    productos_estables: estables.slice(0, 20),
  };
}
