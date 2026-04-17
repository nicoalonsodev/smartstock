import type { SupabaseClient } from '@supabase/supabase-js';

import { llamarGeminiTexto } from '@/lib/ia/gemini';
import { verificarLimiteIA } from '@/lib/ia/limite';
import { PROMPT_REPORTE_EJECUTIVO } from '@/lib/ia/prompts';
import type { Database, Json } from '@/types/database';

import { LimiteIAError } from './extraer-lista';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReporteEjecutivo {
  resumen: string;
  observaciones: string[];
  recomendaciones: string[];
  alertas: string[];
  patron_proveedor: string | null;
  categorias_mas_afectadas: string[];
}

// ---------------------------------------------------------------------------
// Build context payload for Gemini
// ---------------------------------------------------------------------------

async function construirContexto(
  supabase: SupabaseClient<Database>,
  listaId: string,
) {
  const { data: lista } = await supabase
    .from('lista_precios')
    .select('*, proveedor:proveedor_id(id, nombre)')
    .eq('id', listaId)
    .single();

  if (!lista) throw new Error('Lista no encontrada');

  const { data: items } = await supabase
    .from('lista_precios_item')
    .select('nombre_raw, precio_lista, precio_costo_anterior, variacion_pct, margen_anterior_pct, margen_nuevo_pct, precio_venta_sugerido, match_confidence')
    .eq('lista_id', listaId)
    .not('producto_id', 'is', null)
    .order('variacion_pct', { ascending: false });

  // Fetch previous lists from same proveedor for trend comparison
  const { data: listasAnteriores } = await supabase
    .from('lista_precios')
    .select('id, nombre_archivo, fecha_recepcion, variacion_promedio_pct, margen_global_anterior_pct, margen_global_nuevo_pct, total_items, items_con_aumento')
    .eq('proveedor_id', lista.proveedor_id)
    .neq('id', listaId)
    .in('estado', ['analizada', 'aplicada_total', 'aplicada_parcial'])
    .order('fecha_recepcion', { ascending: false })
    .limit(5);

  const proveedor = lista.proveedor as { id: string; nombre: string } | null;

  return {
    proveedor_nombre: proveedor?.nombre ?? 'Desconocido',
    lista: {
      nombre_archivo: lista.nombre_archivo,
      fecha_recepcion: lista.fecha_recepcion,
      total_items: lista.total_items,
      variacion_promedio_pct: lista.variacion_promedio_pct,
      margen_global_anterior_pct: lista.margen_global_anterior_pct,
      margen_global_nuevo_pct: lista.margen_global_nuevo_pct,
      items_con_aumento: lista.items_con_aumento,
      items_con_baja: lista.items_con_baja,
      items_sin_cambio: lista.items_sin_cambio,
      impacto_por_categoria: lista.impacto_por_categoria,
    },
    items_top_variacion: (items ?? []).slice(0, 15).map((i) => ({
      nombre: i.nombre_raw,
      variacion_pct: i.variacion_pct,
      margen_anterior: i.margen_anterior_pct,
      margen_nuevo: i.margen_nuevo_pct,
    })),
    historial_proveedor: (listasAnteriores ?? []).map((l) => ({
      fecha: l.fecha_recepcion,
      variacion_promedio_pct: l.variacion_promedio_pct,
      items: l.total_items,
      items_con_aumento: l.items_con_aumento,
    })),
  };
}

// ---------------------------------------------------------------------------
// Public — Generate executive report
// ---------------------------------------------------------------------------

export async function generarReporteEjecutivo(
  supabase: SupabaseClient<Database>,
  listaId: string,
  ctx: { tenantId: string; userId: string },
): Promise<ReporteEjecutivo> {
  const limite = await verificarLimiteIA(supabase);
  if (!limite.permitido) {
    throw new LimiteIAError(limite.usadas, limite.limite);
  }

  const contexto = await construirContexto(supabase, listaId);

  const prompt = `${PROMPT_REPORTE_EJECUTIVO}\n\nDatos de la lista:\n${JSON.stringify(contexto, null, 2)}`;

  const respuesta = await llamarGeminiTexto(prompt);

  let reporte: ReporteEjecutivo;
  try {
    reporte = JSON.parse(respuesta) as ReporteEjecutivo;
  } catch {
    const jsonMatch = respuesta.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('La IA no devolvió un JSON válido para el reporte');
    reporte = JSON.parse(jsonMatch[0]) as ReporteEjecutivo;
  }

  // Normalize fields
  reporte = {
    resumen: typeof reporte.resumen === 'string' ? reporte.resumen : '',
    observaciones: Array.isArray(reporte.observaciones) ? reporte.observaciones.slice(0, 5) : [],
    recomendaciones: Array.isArray(reporte.recomendaciones) ? reporte.recomendaciones.slice(0, 5) : [],
    alertas: Array.isArray(reporte.alertas) ? reporte.alertas.slice(0, 5) : [],
    patron_proveedor: typeof reporte.patron_proveedor === 'string' ? reporte.patron_proveedor : null,
    categorias_mas_afectadas: Array.isArray(reporte.categorias_mas_afectadas) ? reporte.categorias_mas_afectadas.slice(0, 5) : [],
  };

  // Persist in lista_precios
  await supabase
    .from('lista_precios')
    .update({ resumen_ia: reporte as unknown as Json })
    .eq('id', listaId);

  // Log IA usage
  await supabase.from('importacion_log').insert({
    tenant_id: ctx.tenantId,
    proveedor_id: null,
    archivo_nombre: `[IA reporte] lista ${listaId}`,
    origen: 'ia_pdf',
    total_filas: 0,
    filas_exitosas: 0,
    filas_con_error: 0,
    productos_creados: 0,
    productos_actualizados: 0,
    detalle_errores: null,
    usuario_id: ctx.userId,
  });

  return reporte;
}
