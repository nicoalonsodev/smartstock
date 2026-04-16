import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AlertaOportunidad {
  proveedor_id: string;
  proveedor_nombre: string;
  tipo: 'aumento_probable' | 'sin_lista_reciente';
  mensaje: string;
  dias_desde_ultima_lista: number;
  frecuencia_historica_dias: number | null;
  variacion_promedio_historica_pct: number | null;
}

export interface AlertasOportunidadOutput {
  alertas: AlertaOportunidad[];
  total: number;
}

export interface RadarItem {
  rubro: string;
  proveedor_nombre: string;
  periodo: string;
  variacion_pct: number;
  cantidad_items: number;
  contribuciones: number;
}

export interface RadarOutput {
  items: RadarItem[];
  periodos: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function diasEntre(a: Date, b: Date): number {
  return Math.abs((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Alertas de oportunidad
// ---------------------------------------------------------------------------

export async function detectarOportunidades(
  supabase: SupabaseClient<Database>,
): Promise<AlertasOportunidadOutput> {
  // Get all providers with at least one analyzed list
  const { data: listas } = await supabase
    .from('lista_precios')
    .select('proveedor_id, fecha_recepcion, variacion_promedio_pct')
    .in('estado', ['analizada', 'aplicada_total', 'aplicada_parcial'])
    .order('fecha_recepcion', { ascending: true });

  if (!listas || listas.length === 0) {
    return { alertas: [], total: 0 };
  }

  // Group by provider
  const porProveedor = new Map<string, { fechas: Date[]; variaciones: number[] }>();
  for (const l of listas) {
    if (!porProveedor.has(l.proveedor_id)) {
      porProveedor.set(l.proveedor_id, { fechas: [], variaciones: [] });
    }
    const entry = porProveedor.get(l.proveedor_id)!;
    entry.fechas.push(new Date(l.fecha_recepcion));
    if (l.variacion_promedio_pct != null) {
      entry.variaciones.push(l.variacion_promedio_pct);
    }
  }

  // Get provider names
  const provIds = [...porProveedor.keys()];
  const { data: proveedores } = await supabase
    .from('proveedor')
    .select('id, nombre')
    .in('id', provIds);
  const nombresMap = new Map((proveedores ?? []).map((p) => [p.id, p.nombre]));

  const hoy = new Date();
  const alertas: AlertaOportunidad[] = [];

  for (const [provId, data] of porProveedor) {
    const { fechas, variaciones } = data;
    if (fechas.length < 2) continue;

    // Calculate average frequency between lists
    const intervalos: number[] = [];
    for (let i = 1; i < fechas.length; i++) {
      intervalos.push(diasEntre(fechas[i - 1], fechas[i]));
    }
    const frecuenciaPromedio = intervalos.reduce((s, d) => s + d, 0) / intervalos.length;

    const ultimaFecha = fechas[fechas.length - 1];
    const diasDesdeUltima = diasEntre(ultimaFecha, hoy);
    const varPromedio = variaciones.length > 0
      ? variaciones.reduce((s, v) => s + v, 0) / variaciones.length
      : null;

    const provNombre = nombresMap.get(provId) ?? provId;

    // Alert: provider hasn't sent a list in longer than their historical frequency + 30% buffer
    if (diasDesdeUltima > frecuenciaPromedio * 1.3) {
      const esProblableAumento = varPromedio != null && varPromedio > 2;

      alertas.push({
        proveedor_id: provId,
        proveedor_nombre: provNombre,
        tipo: esProblableAumento ? 'aumento_probable' : 'sin_lista_reciente',
        mensaje: esProblableAumento
          ? `${provNombre} suele enviar listas cada ~${Math.round(frecuenciaPromedio)} días con aumentos promedio de ${varPromedio?.toFixed(1)}%. Hace ${Math.round(diasDesdeUltima)} días que no envía: probable aumento pendiente.`
          : `${provNombre} suele enviar listas cada ~${Math.round(frecuenciaPromedio)} días. Última lista hace ${Math.round(diasDesdeUltima)} días.`,
        dias_desde_ultima_lista: Math.round(diasDesdeUltima),
        frecuencia_historica_dias: Math.round(frecuenciaPromedio),
        variacion_promedio_historica_pct: varPromedio != null
          ? Math.round(varPromedio * 100) / 100
          : null,
      });
    }
  }

  // Sort: probable increases first, then by days overdue
  alertas.sort((a, b) => {
    if (a.tipo !== b.tipo) return a.tipo === 'aumento_probable' ? -1 : 1;
    return b.dias_desde_ultima_lista - a.dias_desde_ultima_lista;
  });

  return { alertas, total: alertas.length };
}

// ---------------------------------------------------------------------------
// Radar de inflación (cross-tenant, anonymized)
// ---------------------------------------------------------------------------

export async function obtenerRadar(
  supabase: SupabaseClient<Database>,
  filtros?: { periodo?: string; rubro?: string },
): Promise<RadarOutput> {
  let query = supabase
    .from('radar_inflacion')
    .select('rubro, proveedor_nombre, periodo, variacion_pct, cantidad_items, contribuciones')
    .order('periodo', { ascending: false });

  if (filtros?.periodo) query = query.eq('periodo', filtros.periodo);
  if (filtros?.rubro) query = query.eq('rubro', filtros.rubro);

  const { data, error } = await query.limit(200);

  if (error) throw new Error(`Error al consultar radar: ${error.message}`);

  const items: RadarItem[] = (data ?? []).map((r) => ({
    rubro: r.rubro,
    proveedor_nombre: r.proveedor_nombre,
    periodo: r.periodo,
    variacion_pct: r.variacion_pct,
    cantidad_items: r.cantidad_items,
    contribuciones: r.contribuciones,
  }));

  const periodos = [...new Set(items.map((i) => i.periodo))].sort().reverse();

  return { items, periodos };
}
