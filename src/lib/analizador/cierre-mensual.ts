import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Json } from '@/types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TopProducto {
  producto_id: string;
  producto_nombre: string;
  ingresos: number;
  margen_bruto: number;
  unidades: number;
}

interface CategoriaResumen {
  categoria_id: string;
  categoria_nombre: string;
  ingresos: number;
  costos: number;
  margen_bruto: number;
  margen_pct: number;
}

export interface CierreMensualData {
  id: string;
  periodo: string;
  ingresos_brutos: number;
  costo_mercaderia: number;
  margen_bruto: number;
  margen_bruto_pct: number | null;
  unidades_vendidas: number;
  comprobantes_emitidos: number;
  ticket_promedio: number | null;
  top_productos: TopProducto[];
  por_categoria: CategoriaResumen[];
}

export interface DashboardRentabilidadData {
  cierre_actual: CierreMensualData | null;
  evolucion: {
    periodo: string;
    ingresos: number;
    costos: number;
    margen_bruto: number;
    margen_pct: number;
  }[];
  listas_pendientes: number;
  top_clientes: { cliente_id: string; cliente_nombre: string; total: number }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function currentPeriodo(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function periodoAnterior(periodo: string, mesesAtras: number): string {
  const [y, m] = periodo.split('-').map(Number);
  const d = new Date(y, m - 1 - mesesAtras, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Calcular cierre para un periodo
// ---------------------------------------------------------------------------

async function calcularCierrePeriodo(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  periodo: string,
): Promise<Omit<CierreMensualData, 'id'>> {
  const desde = `${periodo}-01`;
  const [y, m] = periodo.split('-').map(Number);
  const hasta = new Date(y, m, 0); // last day of month
  const hastaStr = `${y}-${String(m).padStart(2, '0')}-${String(hasta.getDate()).padStart(2, '0')}`;

  const { data: comprobantes } = await supabase
    .from('comprobante')
    .select('id, tipo, total, fecha')
    .neq('tipo', 'presupuesto')
    .eq('estado', 'emitido')
    .gte('fecha', desde)
    .lte('fecha', hastaStr);

  if (!comprobantes || comprobantes.length === 0) {
    return {
      periodo,
      ingresos_brutos: 0,
      costo_mercaderia: 0,
      margen_bruto: 0,
      margen_bruto_pct: null,
      unidades_vendidas: 0,
      comprobantes_emitidos: 0,
      ticket_promedio: null,
      top_productos: [],
      por_categoria: [],
    };
  }

  const compMap = new Map(comprobantes.map((c) => [c.id, c]));
  const compIds = comprobantes.map((c) => c.id);

  // Fetch items in batches
  const BATCH = 200;
  const allItems: { producto_id: string; cantidad: number; precio_unitario: number; precio_costo: number; tipo: string }[] = [];

  for (let i = 0; i < compIds.length; i += BATCH) {
    const batch = compIds.slice(i, i + BATCH);
    const { data: items } = await supabase
      .from('comprobante_item')
      .select('producto_id, cantidad, precio_unitario, precio_costo, comprobante_id')
      .in('comprobante_id', batch);

    for (const it of items ?? []) {
      const comp = compMap.get(it.comprobante_id);
      if (!comp) continue;
      allItems.push({
        producto_id: it.producto_id,
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario,
        precio_costo: it.precio_costo,
        tipo: comp.tipo,
      });
    }
  }

  // Get product info
  const prodIds = [...new Set(allItems.map((i) => i.producto_id))];
  const { data: productos } = await supabase
    .from('producto')
    .select('id, nombre, categoria_id')
    .in('id', prodIds);

  const prodMap = new Map((productos ?? []).map((p) => [p.id, p]));

  const catIds = [...new Set((productos ?? []).map((p) => p.categoria_id).filter(Boolean) as string[])];
  const catMap = new Map<string, string>();
  if (catIds.length > 0) {
    const { data: cats } = await supabase.from('categoria').select('id, nombre').in('id', catIds);
    for (const c of cats ?? []) catMap.set(c.id, c.nombre);
  }

  // Aggregate
  let ingresos = 0;
  let costos = 0;
  let unidades = 0;
  const prodAgg = new Map<string, { ingresos: number; costos: number; unidades: number }>();
  const catAgg = new Map<string, { ingresos: number; costos: number }>();

  for (const item of allItems) {
    const esNC = item.tipo.startsWith('nota_credito');
    const signo = esNC ? -1 : 1;

    const ing = item.precio_unitario * item.cantidad * signo;
    const cos = item.precio_costo * item.cantidad * signo;
    const uni = item.cantidad * signo;

    ingresos += ing;
    costos += cos;
    unidades += uni;

    const prev = prodAgg.get(item.producto_id) ?? { ingresos: 0, costos: 0, unidades: 0 };
    prev.ingresos += ing;
    prev.costos += cos;
    prev.unidades += uni;
    prodAgg.set(item.producto_id, prev);

    const prod = prodMap.get(item.producto_id);
    if (prod?.categoria_id) {
      const cp = catAgg.get(prod.categoria_id) ?? { ingresos: 0, costos: 0 };
      cp.ingresos += ing;
      cp.costos += cos;
      catAgg.set(prod.categoria_id, cp);
    }
  }

  const margen = ingresos - costos;
  const compCount = comprobantes.filter((c) => !c.tipo.startsWith('nota_credito')).length;

  // Top products
  const topProductos: TopProducto[] = [...prodAgg.entries()]
    .map(([pid, agg]) => ({
      producto_id: pid,
      producto_nombre: prodMap.get(pid)?.nombre ?? pid,
      ingresos: round2(agg.ingresos),
      margen_bruto: round2(agg.ingresos - agg.costos),
      unidades: round2(agg.unidades),
    }))
    .sort((a, b) => b.ingresos - a.ingresos)
    .slice(0, 10);

  // By category
  const porCategoria: CategoriaResumen[] = [...catAgg.entries()]
    .map(([catId, agg]) => ({
      categoria_id: catId,
      categoria_nombre: catMap.get(catId) ?? catId,
      ingresos: round2(agg.ingresos),
      costos: round2(agg.costos),
      margen_bruto: round2(agg.ingresos - agg.costos),
      margen_pct: round2(agg.costos > 0 ? ((agg.ingresos - agg.costos) / agg.costos) * 100 : 0),
    }))
    .sort((a, b) => b.ingresos - a.ingresos);

  // Top clientes
  return {
    periodo,
    ingresos_brutos: round2(ingresos),
    costo_mercaderia: round2(costos),
    margen_bruto: round2(margen),
    margen_bruto_pct: round2(costos > 0 ? (margen / costos) * 100 : 0),
    unidades_vendidas: Math.round(unidades),
    comprobantes_emitidos: compCount,
    ticket_promedio: compCount > 0 ? round2(ingresos / compCount) : null,
    top_productos: topProductos,
    por_categoria: porCategoria,
  };
}

// ---------------------------------------------------------------------------
// Public: get or create cierre for current month
// ---------------------------------------------------------------------------

export async function obtenerCierreMensual(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  periodo?: string,
): Promise<CierreMensualData | null> {
  const per = periodo ?? currentPeriodo();

  // Check cache
  const { data: existing } = await supabase
    .from('cierre_mensual')
    .select('*')
    .eq('periodo', per)
    .maybeSingle();

  if (existing) {
    return {
      id: existing.id,
      periodo: existing.periodo,
      ingresos_brutos: Number(existing.ingresos_brutos),
      costo_mercaderia: Number(existing.costo_mercaderia),
      margen_bruto: Number(existing.margen_bruto),
      margen_bruto_pct: existing.margen_bruto_pct != null ? Number(existing.margen_bruto_pct) : null,
      unidades_vendidas: existing.unidades_vendidas,
      comprobantes_emitidos: existing.comprobantes_emitidos,
      ticket_promedio: existing.ticket_promedio != null ? Number(existing.ticket_promedio) : null,
      top_productos: (existing.top_productos as unknown as TopProducto[]) ?? [],
      por_categoria: (existing.por_categoria as unknown as CategoriaResumen[]) ?? [],
    };
  }

  // Calculate fresh
  const cierre = await calcularCierrePeriodo(supabase, tenantId, per);

  const { data: inserted } = await supabase
    .from('cierre_mensual')
    .upsert(
      {
        tenant_id: tenantId,
        periodo: per,
        ingresos_brutos: cierre.ingresos_brutos,
        costo_mercaderia: cierre.costo_mercaderia,
        margen_bruto: cierre.margen_bruto,
        margen_bruto_pct: cierre.margen_bruto_pct,
        unidades_vendidas: cierre.unidades_vendidas,
        comprobantes_emitidos: cierre.comprobantes_emitidos,
        ticket_promedio: cierre.ticket_promedio,
        top_productos: cierre.top_productos as unknown as Json,
        por_categoria: cierre.por_categoria as unknown as Json,
      },
      { onConflict: 'tenant_id,periodo' },
    )
    .select('id')
    .single();

  return {
    id: inserted?.id ?? '',
    ...cierre,
  };
}

// ---------------------------------------------------------------------------
// Dashboard data: current + 6 months evolution
// ---------------------------------------------------------------------------

export async function obtenerDashboardRentabilidad(
  supabase: SupabaseClient<Database>,
  tenantId: string,
): Promise<DashboardRentabilidadData> {
  const per = currentPeriodo();

  // Get/calculate current month
  const cierreActual = await obtenerCierreMensual(supabase, tenantId, per);

  // Evolution: last 6 months
  const periodos: string[] = [];
  for (let i = 5; i >= 0; i--) {
    periodos.push(periodoAnterior(per, i));
  }

  const { data: cierres } = await supabase
    .from('cierre_mensual')
    .select('periodo, ingresos_brutos, costo_mercaderia, margen_bruto, margen_bruto_pct')
    .in('periodo', periodos)
    .order('periodo', { ascending: true });

  const cierreMap = new Map(
    (cierres ?? []).map((c) => [c.periodo, c]),
  );

  const evolucion = periodos.map((p) => {
    const c = cierreMap.get(p);
    return {
      periodo: p,
      ingresos: c ? Number(c.ingresos_brutos) : 0,
      costos: c ? Number(c.costo_mercaderia) : 0,
      margen_bruto: c ? Number(c.margen_bruto) : 0,
      margen_pct: c?.margen_bruto_pct != null ? Number(c.margen_bruto_pct) : 0,
    };
  });

  // Pending lists
  const { count: listasPendientes } = await supabase
    .from('lista_precios')
    .select('id', { count: 'exact', head: true })
    .in('estado', ['pendiente', 'analizada']);

  // Top clientes
  const { data: comprobantes } = await supabase
    .from('comprobante')
    .select('cliente_id, total, tipo')
    .neq('tipo', 'presupuesto')
    .eq('estado', 'emitido')
    .gte('fecha', `${per}-01`);

  const clienteAgg = new Map<string, number>();
  for (const c of comprobantes ?? []) {
    if (!c.cliente_id) continue;
    const signo = c.tipo.startsWith('nota_credito') ? -1 : 1;
    clienteAgg.set(c.cliente_id, (clienteAgg.get(c.cliente_id) ?? 0) + Number(c.total) * signo);
  }

  const clienteIds = [...clienteAgg.keys()];
  const clienteNombres = new Map<string, string>();
  if (clienteIds.length > 0) {
    const { data: clientes } = await supabase
      .from('cliente')
      .select('id, nombre')
      .in('id', clienteIds.slice(0, 50));
    for (const cl of clientes ?? []) clienteNombres.set(cl.id, cl.nombre);
  }

  const topClientes = [...clienteAgg.entries()]
    .map(([cid, total]) => ({
      cliente_id: cid,
      cliente_nombre: clienteNombres.get(cid) ?? cid,
      total: round2(total),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return {
    cierre_actual: cierreActual,
    evolucion,
    listas_pendientes: listasPendientes ?? 0,
    top_clientes: topClientes,
  };
}
