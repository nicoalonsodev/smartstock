import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProveedorScore {
  proveedor_id: string;
  proveedor_nombre: string;
  precio_promedio: number;
  variacion_promedio_pct: number;
  estabilidad_score: number;
  frecuencia_listas: number;
  score_total: number;
}

export interface PerfilProveedor {
  proveedor_id: string;
  proveedor_nombre: string;
  total_listas: number;
  total_productos: number;
  historial: {
    fecha: string;
    variacion_promedio_pct: number | null;
    total_items: number;
  }[];
  tendencia_pct: number | null;
  prediccion_proxima_pct: number | null;
  productos: {
    producto_id: string;
    producto_nombre: string;
    precio_costo: number;
  }[];
}

// ---------------------------------------------------------------------------
// Score calculation
// ---------------------------------------------------------------------------

const PESO_PRECIO = 0.4;
const PESO_ESTABILIDAD = 0.35;
const PESO_FRECUENCIA = 0.25;

export async function compararProveedores(
  supabase: SupabaseClient<Database>,
  productoId?: string,
  categoriaId?: string,
): Promise<ProveedorScore[]> {
  let query = supabase
    .from('producto_proveedor')
    .select('proveedor_id, precio_costo, producto_id');

  if (productoId) {
    query = query.eq('producto_id', productoId);
  }

  const { data: relaciones } = await query;
  if (!relaciones || relaciones.length === 0) return [];

  // If filtering by categoría, get product IDs first
  let productosFiltro: Set<string> | null = null;
  if (categoriaId && !productoId) {
    const { data: prods } = await supabase
      .from('producto')
      .select('id')
      .eq('categoria_id', categoriaId)
      .eq('activo', true);
    productosFiltro = new Set((prods ?? []).map((p) => p.id));
  }

  const filtradas = productosFiltro
    ? relaciones.filter((r) => productosFiltro!.has(r.producto_id))
    : relaciones;

  // Group by proveedor
  const proveedorMap = new Map<string, { precios: number[] }>();
  for (const r of filtradas) {
    if (!proveedorMap.has(r.proveedor_id)) {
      proveedorMap.set(r.proveedor_id, { precios: [] });
    }
    proveedorMap.get(r.proveedor_id)!.precios.push(r.precio_costo);
  }

  const proveedorIds = [...proveedorMap.keys()];
  const { data: proveedores } = await supabase
    .from('proveedor')
    .select('id, nombre')
    .in('id', proveedorIds);

  const nombresMap = new Map((proveedores ?? []).map((p) => [p.id, p.nombre]));

  // Get listas for variación and estabilidad
  const { data: listas } = await supabase
    .from('lista_precios')
    .select('proveedor_id, variacion_promedio_pct, fecha_recepcion')
    .in('proveedor_id', proveedorIds)
    .in('estado', ['analizada', 'aplicada_total', 'aplicada_parcial'])
    .order('fecha_recepcion', { ascending: false });

  const listasMap = new Map<string, number[]>();
  const frecuenciaMap = new Map<string, number>();
  for (const l of listas ?? []) {
    if (!listasMap.has(l.proveedor_id)) listasMap.set(l.proveedor_id, []);
    if (l.variacion_promedio_pct != null) {
      listasMap.get(l.proveedor_id)!.push(l.variacion_promedio_pct);
    }
    frecuenciaMap.set(l.proveedor_id, (frecuenciaMap.get(l.proveedor_id) ?? 0) + 1);
  }

  const scores: ProveedorScore[] = [];
  const allAvgPrecios: number[] = [];

  for (const [provId, data] of proveedorMap) {
    const avg = data.precios.reduce((s, p) => s + p, 0) / data.precios.length;
    allAvgPrecios.push(avg);
  }

  const maxPrecio = Math.max(...allAvgPrecios, 1);
  const maxFrec = Math.max(...[...frecuenciaMap.values()], 1);

  for (const [provId, data] of proveedorMap) {
    const avgPrecio = data.precios.reduce((s, p) => s + p, 0) / data.precios.length;
    const variaciones = listasMap.get(provId) ?? [];
    const avgVar = variaciones.length > 0
      ? variaciones.reduce((s, v) => s + v, 0) / variaciones.length
      : 0;

    // Estabilidad: lower variance = better score (0-1)
    const varianza = variaciones.length > 1
      ? variaciones.reduce((s, v) => s + (v - avgVar) ** 2, 0) / variaciones.length
      : 0;
    const estabilidad = Math.max(0, 1 - Math.sqrt(varianza) / 20);

    // Price score: lower is better (0-1)
    const precioScore = 1 - (avgPrecio / maxPrecio);

    // Frequency: more lists = more transparency (0-1)
    const frecuencia = frecuenciaMap.get(provId) ?? 0;
    const frecScore = frecuencia / maxFrec;

    const total = precioScore * PESO_PRECIO
      + estabilidad * PESO_ESTABILIDAD
      + frecScore * PESO_FRECUENCIA;

    scores.push({
      proveedor_id: provId,
      proveedor_nombre: nombresMap.get(provId) ?? provId,
      precio_promedio: Math.round(avgPrecio * 100) / 100,
      variacion_promedio_pct: Math.round(avgVar * 100) / 100,
      estabilidad_score: Math.round(estabilidad * 100) / 100,
      frecuencia_listas: frecuencia,
      score_total: Math.round(total * 100) / 100,
    });
  }

  scores.sort((a, b) => b.score_total - a.score_total);
  return scores;
}

// ---------------------------------------------------------------------------
// Provider profile with trend + prediction
// ---------------------------------------------------------------------------

function regresionLineal(valores: number[]): { pendiente: number; prediccion: number } {
  const n = valores.length;
  if (n < 2) return { pendiente: 0, prediccion: valores[0] ?? 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += valores[i];
    sumXY += i * valores[i];
    sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { pendiente: 0, prediccion: valores[n - 1] ?? 0 };

  const pendiente = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - pendiente * sumX) / n;
  const prediccion = pendiente * n + intercept;

  return { pendiente: Math.round(pendiente * 100) / 100, prediccion: Math.round(prediccion * 100) / 100 };
}

export async function perfilProveedor(
  supabase: SupabaseClient<Database>,
  proveedorId: string,
): Promise<PerfilProveedor> {
  const { data: proveedor } = await supabase
    .from('proveedor')
    .select('id, nombre')
    .eq('id', proveedorId)
    .single();

  if (!proveedor) throw new Error('Proveedor no encontrado');

  const { data: listas } = await supabase
    .from('lista_precios')
    .select('id, fecha_recepcion, variacion_promedio_pct, total_items')
    .eq('proveedor_id', proveedorId)
    .in('estado', ['analizada', 'aplicada_total', 'aplicada_parcial'])
    .order('fecha_recepcion', { ascending: true });

  const historial = (listas ?? []).map((l) => ({
    fecha: l.fecha_recepcion,
    variacion_promedio_pct: l.variacion_promedio_pct,
    total_items: l.total_items,
  }));

  const variaciones = historial
    .map((h) => h.variacion_promedio_pct)
    .filter((v): v is number => v != null);

  let tendencia: number | null = null;
  let prediccion: number | null = null;

  if (variaciones.length >= 2) {
    const reg = regresionLineal(variaciones);
    tendencia = reg.pendiente;
    prediccion = reg.prediccion;
  }

  const { data: relaciones } = await supabase
    .from('producto_proveedor')
    .select('producto_id, precio_costo, producto:producto_id(id, nombre)')
    .eq('proveedor_id', proveedorId)
    .limit(50);

  const productos = (relaciones ?? []).map((r) => ({
    producto_id: r.producto_id,
    producto_nombre: (r.producto as { nombre: string } | null)?.nombre ?? r.producto_id,
    precio_costo: r.precio_costo,
  }));

  return {
    proveedor_id: proveedor.id,
    proveedor_nombre: proveedor.nombre,
    total_listas: historial.length,
    total_productos: productos.length,
    historial,
    tendencia_pct: tendencia,
    prediccion_proxima_pct: prediccion,
    productos,
  };
}
