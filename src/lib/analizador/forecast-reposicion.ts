import type { SupabaseClient } from '@supabase/supabase-js';

import { compararProveedores } from '@/lib/analizador/comparar-proveedores';
import type { Database } from '@/types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MovimientoSalida {
  producto_id: string;
  cantidad: number;
  fecha: string;
}

interface ConsumoMensual {
  periodo: string;
  mes: number; // 1-12
  cantidad: number;
}

interface ProveedorSugerido {
  proveedor_id: string;
  proveedor_nombre: string;
  precio_costo: number;
  score: number;
}

export interface ForecastProducto {
  producto_id: string;
  producto_nombre: string;
  categoria_id: string | null;
  stock_actual: number;
  stock_minimo: number;
  consumo_diario: number;
  dias_restantes: number;
  fecha_agotamiento: string;
  fecha_sugerida_compra: string;
  cantidad_sugerida: number;
  costo_estimado: number;
  estacionalidad_detectada: boolean;
  indice_estacional: number;
  proveedor_sugerido: ProveedorSugerido | null;
  urgencia: 'critica' | 'alta' | 'media' | 'baja';
}

export interface ForecastOutput {
  productos: ForecastProducto[];
  costo_total_estimado: number;
  productos_criticos: number;
  productos_con_estacionalidad: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

/**
 * Calculates seasonal indices using ratio-to-moving-average method.
 * Returns an array of 12 indices (one per month, index 0 = January).
 * If not enough data (< 12 months), returns null.
 */
function calcularIndicesEstacionales(
  consumoMensual: ConsumoMensual[],
): number[] | null {
  if (consumoMensual.length < 12) return null;

  const porMes = new Map<number, number[]>();
  for (const cm of consumoMensual) {
    if (!porMes.has(cm.mes)) porMes.set(cm.mes, []);
    porMes.get(cm.mes)!.push(cm.cantidad);
  }

  // Need at least some data in most months
  const mesesConDatos = [...porMes.entries()].filter(([, v]) => v.length > 0);
  if (mesesConDatos.length < 6) return null;

  const promedioGlobal = consumoMensual.reduce((s, c) => s + c.cantidad, 0) / consumoMensual.length;
  if (promedioGlobal <= 0) return null;

  const indices: number[] = [];
  for (let m = 1; m <= 12; m++) {
    const datos = porMes.get(m) ?? [];
    if (datos.length === 0) {
      indices.push(1.0);
    } else {
      const promMes = datos.reduce((s, v) => s + v, 0) / datos.length;
      indices.push(promMes / promedioGlobal);
    }
  }

  return indices;
}

const LEAD_TIME_DIAS = 7; // Default lead time for ordering

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

export async function calcularForecast(
  supabase: SupabaseClient<Database>,
  filtros?: {
    categoria_id?: string;
    proveedor_id?: string;
  },
): Promise<ForecastOutput> {
  // 1. Get active products with stock info
  let prodQ = supabase
    .from('producto')
    .select('id, nombre, categoria_id, proveedor_id, stock_actual, stock_minimo, precio_costo')
    .eq('activo', true);

  if (filtros?.categoria_id) prodQ = prodQ.eq('categoria_id', filtros.categoria_id);
  if (filtros?.proveedor_id) prodQ = prodQ.eq('proveedor_id', filtros.proveedor_id);

  const { data: productos } = await prodQ;
  if (!productos || productos.length === 0) {
    return { productos: [], costo_total_estimado: 0, productos_criticos: 0, productos_con_estacionalidad: 0 };
  }

  const productoIds = productos.map((p) => p.id);

  // 2. Get exit movements for the last 12 months
  const hace12Meses = new Date();
  hace12Meses.setMonth(hace12Meses.getMonth() - 12);

  const BATCH = 200;
  const movimientos: MovimientoSalida[] = [];
  for (let i = 0; i < productoIds.length; i += BATCH) {
    const batch = productoIds.slice(i, i + BATCH);
    const { data: movs } = await supabase
      .from('movimiento')
      .select('producto_id, cantidad, created_at')
      .eq('tipo', 'salida')
      .in('producto_id', batch)
      .gte('created_at', hace12Meses.toISOString());

    for (const m of movs ?? []) {
      movimientos.push({
        producto_id: m.producto_id,
        cantidad: m.cantidad,
        fecha: m.created_at,
      });
    }
  }

  // 3. Group movements by product and month
  const prodMovs = new Map<string, ConsumoMensual[]>();
  for (const m of movimientos) {
    if (!prodMovs.has(m.producto_id)) prodMovs.set(m.producto_id, []);
    const d = new Date(m.fecha);
    const periodo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const mes = d.getMonth() + 1;

    const arr = prodMovs.get(m.producto_id)!;
    const existing = arr.find((c) => c.periodo === periodo);
    if (existing) {
      existing.cantidad += m.cantidad;
    } else {
      arr.push({ periodo, mes, cantidad: m.cantidad });
    }
  }

  // 4. Get proveedor scores if available
  const provScores = new Map<string, { proveedor_id: string; nombre: string; costo: number; score: number }>();
  try {
    const scores = await compararProveedores(supabase);
    for (const s of scores) {
      provScores.set(s.proveedor_id, {
        proveedor_id: s.proveedor_id,
        nombre: s.proveedor_nombre,
        costo: s.precio_promedio,
        score: s.score_total,
      });
    }
  } catch {
    // Non-critical; proceed without provider scores
  }

  // 5. Get producto_proveedor for cost info
  const { data: prodProvs } = await supabase
    .from('producto_proveedor')
    .select('producto_id, proveedor_id, precio_costo')
    .in('producto_id', productoIds);

  const prodProvMap = new Map<string, { proveedor_id: string; precio_costo: number }[]>();
  for (const pp of prodProvs ?? []) {
    if (!prodProvMap.has(pp.producto_id)) prodProvMap.set(pp.producto_id, []);
    prodProvMap.get(pp.producto_id)!.push({
      proveedor_id: pp.proveedor_id,
      precio_costo: pp.precio_costo,
    });
  }

  // 6. Calculate forecast per product
  const hoy = new Date();
  const mesActual = hoy.getMonth() + 1;
  const resultados: ForecastProducto[] = [];

  for (const prod of productos) {
    const consumoMensual = prodMovs.get(prod.id) ?? [];
    if (consumoMensual.length === 0) continue; // No sales history

    const totalConsumo = consumoMensual.reduce((s, c) => s + c.cantidad, 0);
    const mesesConDatos = consumoMensual.length;

    // Base daily consumption
    const consumoDiarioBase = totalConsumo / (mesesConDatos * 30);
    if (consumoDiarioBase <= 0) continue;

    // Seasonality adjustment
    const indices = calcularIndicesEstacionales(consumoMensual);
    const indiceActual = indices ? indices[mesActual - 1] : 1.0;
    const consumoDiario = consumoDiarioBase * indiceActual;

    // Days until stockout
    const stockDisponible = Math.max(0, prod.stock_actual);
    const diasRestantes = consumoDiario > 0 ? stockDisponible / consumoDiario : Infinity;

    const fechaAgotamiento = isFinite(diasRestantes)
      ? formatDate(addDays(hoy, Math.floor(diasRestantes)))
      : formatDate(addDays(hoy, 365));

    // Suggested purchase date (before reaching stock_minimo + lead time)
    const stockHastaMinimo = Math.max(0, stockDisponible - prod.stock_minimo);
    const diasHastaMinimo = consumoDiario > 0 ? stockHastaMinimo / consumoDiario : Infinity;
    const diasParaCompra = Math.max(0, diasHastaMinimo - LEAD_TIME_DIAS);
    const fechaSugerida = isFinite(diasParaCompra)
      ? formatDate(addDays(hoy, Math.floor(diasParaCompra)))
      : formatDate(addDays(hoy, 365));

    // Suggested quantity: 30 days of stock + stock_minimo buffer
    const cantidadSugerida = Math.ceil(consumoDiario * 30) + prod.stock_minimo;

    // Best provider
    let provSugerido: ProveedorSugerido | null = null;
    const proveedoresProducto = prodProvMap.get(prod.id) ?? [];
    if (proveedoresProducto.length > 0) {
      // Pick provider with best score, fallback to cheapest
      let best = proveedoresProducto[0];
      let bestScore = provScores.get(best.proveedor_id)?.score ?? 0;

      for (const pp of proveedoresProducto.slice(1)) {
        const sc = provScores.get(pp.proveedor_id)?.score ?? 0;
        if (sc > bestScore || (sc === bestScore && pp.precio_costo < best.precio_costo)) {
          best = pp;
          bestScore = sc;
        }
      }

      provSugerido = {
        proveedor_id: best.proveedor_id,
        proveedor_nombre: provScores.get(best.proveedor_id)?.nombre ?? best.proveedor_id,
        precio_costo: best.precio_costo,
        score: bestScore,
      };
    }

    const costoUnitario = provSugerido?.precio_costo ?? prod.precio_costo;
    const costoEstimado = round2(cantidadSugerida * costoUnitario);

    // Urgency
    let urgencia: ForecastProducto['urgencia'] = 'baja';
    if (diasRestantes <= 3) urgencia = 'critica';
    else if (diasRestantes <= 7) urgencia = 'alta';
    else if (diasRestantes <= 14) urgencia = 'media';

    resultados.push({
      producto_id: prod.id,
      producto_nombre: prod.nombre,
      categoria_id: prod.categoria_id,
      stock_actual: prod.stock_actual,
      stock_minimo: prod.stock_minimo,
      consumo_diario: round2(consumoDiario),
      dias_restantes: round2(Math.min(diasRestantes, 9999)),
      fecha_agotamiento: fechaAgotamiento,
      fecha_sugerida_compra: fechaSugerida,
      cantidad_sugerida: cantidadSugerida,
      costo_estimado: costoEstimado,
      estacionalidad_detectada: indices != null,
      indice_estacional: round2(indiceActual),
      proveedor_sugerido: provSugerido,
      urgencia,
    });
  }

  // Sort by urgency (critical first), then by days remaining
  const urgenciaOrden = { critica: 0, alta: 1, media: 2, baja: 3 };
  resultados.sort(
    (a, b) => urgenciaOrden[a.urgencia] - urgenciaOrden[b.urgencia] || a.dias_restantes - b.dias_restantes,
  );

  return {
    productos: resultados,
    costo_total_estimado: round2(resultados.reduce((s, p) => s + p.costo_estimado, 0)),
    productos_criticos: resultados.filter((p) => p.urgencia === 'critica' || p.urgencia === 'alta').length,
    productos_con_estacionalidad: resultados.filter((p) => p.estacionalidad_detectada).length,
  };
}
