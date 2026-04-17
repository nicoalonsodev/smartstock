import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ClasificacionBCG = 'estrella' | 'vaca' | 'interrogacion' | 'lastre';

export interface ProductoBCG {
  producto_id: string;
  producto_nombre: string;
  categoria_id: string | null;
  categoria_nombre: string | null;
  margen_pct: number;
  rotacion: number;
  contribucion_absoluta: number;
  clasificacion: ClasificacionBCG;
  score: number;
}

export interface RankingBCGOutput {
  productos: ProductoBCG[];
  top_estrellas: ProductoBCG[];
  top_lastres: ProductoBCG[];
  medianas: {
    margen_mediana_pct: number;
    rotacion_mediana: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function mediana(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function clasificar(
  margenPct: number,
  rotacion: number,
  medianaMargen: number,
  medianaRotacion: number,
): ClasificacionBCG {
  const altoMargen = margenPct >= medianaMargen;
  const altaRotacion = rotacion >= medianaRotacion;

  if (altoMargen && altaRotacion) return 'estrella';
  if (altoMargen && !altaRotacion) return 'vaca';
  if (!altoMargen && altaRotacion) return 'interrogacion';
  return 'lastre';
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

export async function calcularRankingBCG(
  supabase: SupabaseClient<Database>,
  filtros?: {
    categoria_id?: string;
    desde?: string;
    hasta?: string;
  },
): Promise<RankingBCGOutput> {
  // 1. Fetch sales comprobantes
  let compQ = supabase
    .from('comprobante')
    .select('id, fecha, tipo')
    .neq('tipo', 'presupuesto')
    .eq('estado', 'emitido');

  if (filtros?.desde) compQ = compQ.gte('fecha', filtros.desde);
  if (filtros?.hasta) compQ = compQ.lte('fecha', filtros.hasta);

  const { data: comprobantes } = await compQ;
  if (!comprobantes || comprobantes.length === 0) return emptyOutput();

  const compMap = new Map(comprobantes.map((c) => [c.id, c]));
  const compIds = comprobantes.map((c) => c.id);

  // 2. Fetch comprobante_items
  const prodAgg = new Map<string, { unidades: number; ingresos: number; costos: number }>();

  const BATCH = 200;
  for (let i = 0; i < compIds.length; i += BATCH) {
    const batch = compIds.slice(i, i + BATCH);
    const { data: items } = await supabase
      .from('comprobante_item')
      .select('producto_id, precio_unitario, precio_costo, cantidad, comprobante_id')
      .in('comprobante_id', batch);

    for (const it of items ?? []) {
      const comp = compMap.get(it.comprobante_id);
      if (!comp) continue;

      const esNC = comp.tipo.startsWith('nota_credito');
      const signo = esNC ? -1 : 1;

      const prev = prodAgg.get(it.producto_id) ?? { unidades: 0, ingresos: 0, costos: 0 };
      prev.unidades += it.cantidad * signo;
      prev.ingresos += it.precio_unitario * it.cantidad * signo;
      prev.costos += it.precio_costo * it.cantidad * signo;
      prodAgg.set(it.producto_id, prev);
    }
  }

  if (prodAgg.size === 0) return emptyOutput();

  // 3. Get product info
  const productoIds = [...prodAgg.keys()];
  const { data: productos } = await supabase
    .from('producto')
    .select('id, nombre, categoria_id')
    .in('id', productoIds);

  const prodInfoMap = new Map((productos ?? []).map((p) => [p.id, p]));

  // Category filter
  let filteredSet: Set<string> | null = null;
  if (filtros?.categoria_id) {
    filteredSet = new Set(
      (productos ?? []).filter((p) => p.categoria_id === filtros.categoria_id).map((p) => p.id),
    );
  }

  // Category names
  const catIds = [...new Set((productos ?? []).map((p) => p.categoria_id).filter(Boolean) as string[])];
  const catMap = new Map<string, string>();
  if (catIds.length > 0) {
    const { data: cats } = await supabase.from('categoria').select('id, nombre').in('id', catIds);
    for (const c of cats ?? []) catMap.set(c.id, c.nombre);
  }

  // 4. Calculate margin + rotation per product
  // Rotation = units sold (higher = faster moving)
  const rawProducts: { pid: string; margenPct: number; rotacion: number; contribucion: number }[] = [];

  for (const [pid, agg] of prodAgg) {
    if (filteredSet && !filteredSet.has(pid)) continue;
    if (!prodInfoMap.has(pid) || agg.ingresos <= 0) continue;

    const margenBruto = agg.ingresos - agg.costos;
    const margenPct = agg.costos > 0 ? (margenBruto / agg.costos) * 100 : 0;

    rawProducts.push({
      pid,
      margenPct,
      rotacion: Math.max(0, agg.unidades),
      contribucion: margenBruto,
    });
  }

  if (rawProducts.length === 0) return emptyOutput();

  // 5. Calculate medians
  const medianaMargen = mediana(rawProducts.map((p) => p.margenPct));
  const medianaRotacion = mediana(rawProducts.map((p) => p.rotacion));

  // 6. Classify
  const result: ProductoBCG[] = rawProducts.map((rp) => {
    const prod = prodInfoMap.get(rp.pid)!;
    const cls = clasificar(rp.margenPct, rp.rotacion, medianaMargen, medianaRotacion);

    const scoreMap: Record<ClasificacionBCG, number> = {
      estrella: 4,
      vaca: 3,
      interrogacion: 2,
      lastre: 1,
    };

    return {
      producto_id: rp.pid,
      producto_nombre: prod.nombre,
      categoria_id: prod.categoria_id,
      categoria_nombre: prod.categoria_id ? catMap.get(prod.categoria_id) ?? null : null,
      margen_pct: round2(rp.margenPct),
      rotacion: round2(rp.rotacion),
      contribucion_absoluta: round2(rp.contribucion),
      clasificacion: cls,
      score: scoreMap[cls],
    };
  });

  result.sort((a, b) => b.score - a.score || b.contribucion_absoluta - a.contribucion_absoluta);

  const topEstrellas = result.filter((p) => p.clasificacion === 'estrella').slice(0, 10);
  const topLastres = result.filter((p) => p.clasificacion === 'lastre').slice(0, 10);

  return {
    productos: result,
    top_estrellas: topEstrellas,
    top_lastres: topLastres,
    medianas: {
      margen_mediana_pct: round2(medianaMargen),
      rotacion_mediana: round2(medianaRotacion),
    },
  };
}

function emptyOutput(): RankingBCGOutput {
  return {
    productos: [],
    top_estrellas: [],
    top_lastres: [],
    medianas: { margen_mediana_pct: 0, rotacion_mediana: 0 },
  };
}
