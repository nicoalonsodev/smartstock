import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VentaRow {
  producto_id: string;
  precio_unitario: number;
  precio_costo: number;
  cantidad: number;
  fecha: string;
  tipo: string;
}

interface MargenProducto {
  producto_id: string;
  producto_nombre: string;
  categoria_id: string | null;
  categoria_nombre: string | null;
  unidades_vendidas: number;
  ingresos: number;
  costos: number;
  margen_bruto: number;
  margen_pct: number;
  contribucion_absoluta: number;
}

interface MargenMensual {
  periodo: string;
  ingresos: number;
  costos: number;
  margen_bruto: number;
  margen_pct: number;
}

interface AlertaMargen {
  producto_id: string;
  producto_nombre: string;
  margen_actual_pct: number;
  margen_promedio_pct: number;
  caida_pct: number;
  tipo: 'caida_margen';
}

export interface MargenRealOutput {
  productos: MargenProducto[];
  evolucion_mensual: MargenMensual[];
  tendencia: {
    ultimo_mes_pct: number | null;
    promedio_3m_pct: number | null;
    direccion: 'sube' | 'baja' | 'estable';
  };
  alertas: AlertaMargen[];
  ranking_contribucion: MargenProducto[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function periodoFromFecha(fecha: string): string {
  return fecha.slice(0, 7); // YYYY-MM
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

export async function calcularMargenReal(
  supabase: SupabaseClient<Database>,
  filtros?: {
    producto_id?: string;
    categoria_id?: string;
    desde?: string;
    hasta?: string;
  },
): Promise<MargenRealOutput> {
  // Fetch comprobantes (excl. presupuestos)
  let compQ = supabase
    .from('comprobante')
    .select('id, fecha, tipo')
    .neq('tipo', 'presupuesto')
    .eq('estado', 'emitido');

  if (filtros?.desde) compQ = compQ.gte('fecha', filtros.desde);
  if (filtros?.hasta) compQ = compQ.lte('fecha', filtros.hasta);

  const { data: comprobantes } = await compQ;
  if (!comprobantes || comprobantes.length === 0) {
    return emptyOutput();
  }

  const compMap = new Map(comprobantes.map((c) => [c.id, c]));
  const compIds = comprobantes.map((c) => c.id);

  // Fetch items in batches (Supabase IN has limits)
  const allItems: VentaRow[] = [];
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
      allItems.push({
        producto_id: it.producto_id,
        precio_unitario: it.precio_unitario,
        precio_costo: it.precio_costo,
        cantidad: it.cantidad,
        fecha: comp.fecha,
        tipo: comp.tipo,
      });
    }
  }

  if (allItems.length === 0) return emptyOutput();

  // Get product info
  const productoIds = [...new Set(allItems.map((i) => i.producto_id))];

  let prodQuery = supabase
    .from('producto')
    .select('id, nombre, categoria_id')
    .in('id', productoIds);
  if (filtros?.producto_id) prodQuery = prodQuery.eq('id', filtros.producto_id);

  const { data: productos } = await prodQuery;
  const prodMap = new Map((productos ?? []).map((p) => [p.id, p]));

  // Category filter
  let filteredIds: Set<string> | null = null;
  if (filtros?.categoria_id) {
    filteredIds = new Set(
      (productos ?? []).filter((p) => p.categoria_id === filtros.categoria_id).map((p) => p.id),
    );
  }
  if (filtros?.producto_id) {
    filteredIds = new Set([filtros.producto_id]);
  }

  // Category names
  const catIds = [...new Set((productos ?? []).map((p) => p.categoria_id).filter(Boolean) as string[])];
  const catMap = new Map<string, string>();
  if (catIds.length > 0) {
    const { data: cats } = await supabase.from('categoria').select('id, nombre').in('id', catIds);
    for (const c of cats ?? []) catMap.set(c.id, c.nombre);
  }

  // Aggregate per product
  const prodAgg = new Map<string, { unidades: number; ingresos: number; costos: number }>();
  // Aggregate per month
  const mesAgg = new Map<string, { ingresos: number; costos: number }>();
  // Per product per month (for alerts)
  const prodMesAgg = new Map<string, Map<string, { ingresos: number; costos: number }>>();

  for (const row of allItems) {
    if (filteredIds && !filteredIds.has(row.producto_id)) continue;
    if (!prodMap.has(row.producto_id)) continue;

    const esNotaCredito = row.tipo.startsWith('nota_credito');
    const signo = esNotaCredito ? -1 : 1;

    const ingreso = row.precio_unitario * row.cantidad * signo;
    const costo = row.precio_costo * row.cantidad * signo;
    const unidades = row.cantidad * signo;

    // Product aggregate
    const prev = prodAgg.get(row.producto_id) ?? { unidades: 0, ingresos: 0, costos: 0 };
    prev.unidades += unidades;
    prev.ingresos += ingreso;
    prev.costos += costo;
    prodAgg.set(row.producto_id, prev);

    // Monthly aggregate
    const periodo = periodoFromFecha(row.fecha);
    const mPrev = mesAgg.get(periodo) ?? { ingresos: 0, costos: 0 };
    mPrev.ingresos += ingreso;
    mPrev.costos += costo;
    mesAgg.set(periodo, mPrev);

    // Product-month for alerts
    if (!prodMesAgg.has(row.producto_id)) prodMesAgg.set(row.producto_id, new Map());
    const pmMap = prodMesAgg.get(row.producto_id)!;
    const pmPrev = pmMap.get(periodo) ?? { ingresos: 0, costos: 0 };
    pmPrev.ingresos += ingreso;
    pmPrev.costos += costo;
    pmMap.set(periodo, pmPrev);
  }

  // Build per-product results
  const productosResult: MargenProducto[] = [];
  for (const [pid, agg] of prodAgg) {
    const prod = prodMap.get(pid);
    if (!prod || agg.ingresos <= 0) continue;

    const margenBruto = agg.ingresos - agg.costos;
    const margenPct = agg.costos > 0 ? (margenBruto / agg.costos) * 100 : 0;

    productosResult.push({
      producto_id: pid,
      producto_nombre: prod.nombre,
      categoria_id: prod.categoria_id,
      categoria_nombre: prod.categoria_id ? catMap.get(prod.categoria_id) ?? null : null,
      unidades_vendidas: round2(agg.unidades),
      ingresos: round2(agg.ingresos),
      costos: round2(agg.costos),
      margen_bruto: round2(margenBruto),
      margen_pct: round2(margenPct),
      contribucion_absoluta: round2(margenBruto),
    });
  }

  // Monthly evolution
  const meses = [...mesAgg.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodo, agg]) => {
      const margen = agg.ingresos - agg.costos;
      return {
        periodo,
        ingresos: round2(agg.ingresos),
        costos: round2(agg.costos),
        margen_bruto: round2(margen),
        margen_pct: round2(agg.costos > 0 ? (margen / agg.costos) * 100 : 0),
      };
    });

  // Trend from last 3 months
  const ultimosMeses = meses.slice(-3);
  const ultimoMesPct = meses.length > 0 ? meses[meses.length - 1].margen_pct : null;
  const promedio3m = ultimosMeses.length > 0
    ? round2(ultimosMeses.reduce((s, m) => s + m.margen_pct, 0) / ultimosMeses.length)
    : null;

  let direccion: 'sube' | 'baja' | 'estable' = 'estable';
  if (ultimosMeses.length >= 2) {
    const primero = ultimosMeses[0].margen_pct;
    const ultimo = ultimosMeses[ultimosMeses.length - 1].margen_pct;
    if (ultimo > primero + 2) direccion = 'sube';
    else if (ultimo < primero - 2) direccion = 'baja';
  }

  // Alerts: margin drop > 5% vs recent average
  const UMBRAL_ALERTA = 5;
  const alertas: AlertaMargen[] = [];
  const mesesOrdenados = [...mesAgg.keys()].sort();
  const ultimoMes = mesesOrdenados.length > 0 ? mesesOrdenados[mesesOrdenados.length - 1] : null;
  const mesesRecientes = mesesOrdenados.slice(-3);

  if (ultimoMes && mesesRecientes.length >= 2) {
    for (const [pid, mMap] of prodMesAgg) {
      const prod = prodMap.get(pid);
      if (!prod) continue;

      const mesActual = mMap.get(ultimoMes);
      if (!mesActual || mesActual.costos <= 0) continue;

      const margenActual = ((mesActual.ingresos - mesActual.costos) / mesActual.costos) * 100;

      // Average from previous months (exclude last)
      const mesesPrevios = mesesRecientes.slice(0, -1);
      const margenesPrev: number[] = [];
      for (const m of mesesPrevios) {
        const d = mMap.get(m);
        if (d && d.costos > 0) {
          margenesPrev.push(((d.ingresos - d.costos) / d.costos) * 100);
        }
      }

      if (margenesPrev.length === 0) continue;
      const promedio = margenesPrev.reduce((s, v) => s + v, 0) / margenesPrev.length;
      const caida = promedio - margenActual;

      if (caida > UMBRAL_ALERTA) {
        alertas.push({
          producto_id: pid,
          producto_nombre: prod.nombre,
          margen_actual_pct: round2(margenActual),
          margen_promedio_pct: round2(promedio),
          caida_pct: round2(caida),
          tipo: 'caida_margen',
        });
      }
    }
  }

  alertas.sort((a, b) => b.caida_pct - a.caida_pct);

  // Ranking by absolute contribution
  const ranking = [...productosResult]
    .sort((a, b) => b.contribucion_absoluta - a.contribucion_absoluta);

  return {
    productos: productosResult,
    evolucion_mensual: meses,
    tendencia: {
      ultimo_mes_pct: ultimoMesPct,
      promedio_3m_pct: promedio3m,
      direccion,
    },
    alertas: alertas.slice(0, 20),
    ranking_contribucion: ranking.slice(0, 20),
  };
}

function emptyOutput(): MargenRealOutput {
  return {
    productos: [],
    evolucion_mensual: [],
    tendencia: { ultimo_mes_pct: null, promedio_3m_pct: null, direccion: 'estable' },
    alertas: [],
    ranking_contribucion: [],
  };
}
