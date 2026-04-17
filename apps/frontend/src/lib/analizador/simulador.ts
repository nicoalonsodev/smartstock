/**
 * Pure simulation functions for price strategies.
 * Designed to run client-side for instant feedback.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModoSimulacion =
  | 'mantener_margen'
  | 'margen_fijo'
  | 'aumento_fijo'
  | 'piso_margen'
  | 'manual';

export interface ItemSimulable {
  id: string;
  nombre_raw: string;
  precio_lista: number;
  precio_costo_anterior: number | null;
  precio_venta_actual: number | null;
  margen_anterior_pct: number | null;
  precio_venta_sugerido: number | null;
  precio_venta_decidido: number | null;
  incluir_en_aplicacion: boolean;
}

export interface ItemSimulado extends ItemSimulable {
  precio_venta_simulado: number;
  margen_simulado_pct: number;
}

export interface ResumenSimulacion {
  margen_global_simulado_pct: number;
  aumento_promedio_publico_pct: number;
  items_margen_bajo: number;
  items_total: number;
}

export interface SimulacionCompleta {
  items: ItemSimulado[];
  resumen: ResumenSimulacion;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function margenPct(costo: number, venta: number): number {
  if (costo <= 0) return 0;
  return ((venta - costo) / costo) * 100;
}

const MARGEN_BAJO_UMBRAL = 10;

// ---------------------------------------------------------------------------
// Strategies
// ---------------------------------------------------------------------------

function precioMantenerMargen(item: ItemSimulable): number {
  const margenOriginal = item.margen_anterior_pct ?? 30;
  const factor = margenOriginal > 0 ? margenOriginal : 30;
  return round2(item.precio_lista * (1 + factor / 100));
}

function precioMargenFijo(item: ItemSimulable, margenPctFijo: number): number {
  return round2(item.precio_lista * (1 + margenPctFijo / 100));
}

function precioAumentoFijo(item: ItemSimulable, aumentoPct: number): number {
  const ventaActual = item.precio_venta_actual ?? item.precio_lista * 1.3;
  return round2(ventaActual * (1 + aumentoPct / 100));
}

function precioPisoMargen(item: ItemSimulable, pisoMargenPct: number): number {
  const ventaActual = item.precio_venta_actual ?? 0;
  const margenActualConNuevoCosto = margenPct(item.precio_lista, ventaActual);

  if (margenActualConNuevoCosto >= pisoMargenPct) {
    return ventaActual > 0 ? ventaActual : round2(item.precio_lista * (1 + pisoMargenPct / 100));
  }

  return round2(item.precio_lista * (1 + pisoMargenPct / 100));
}

function precioManual(item: ItemSimulable): number {
  return item.precio_venta_decidido
    ?? item.precio_venta_sugerido
    ?? item.precio_venta_actual
    ?? round2(item.precio_lista * 1.3);
}

// ---------------------------------------------------------------------------
// Public — Simulate
// ---------------------------------------------------------------------------

export function simularPrecios(
  items: ItemSimulable[],
  modo: ModoSimulacion,
  parametro?: number,
): SimulacionCompleta {
  const itemsIncluidos = items.filter((i) => i.incluir_en_aplicacion);

  const itemsSimulados: ItemSimulado[] = itemsIncluidos.map((item) => {
    let precioSimulado: number;

    switch (modo) {
      case 'mantener_margen':
        precioSimulado = precioMantenerMargen(item);
        break;
      case 'margen_fijo':
        precioSimulado = precioMargenFijo(item, parametro ?? 30);
        break;
      case 'aumento_fijo':
        precioSimulado = precioAumentoFijo(item, parametro ?? 10);
        break;
      case 'piso_margen':
        precioSimulado = precioPisoMargen(item, parametro ?? 15);
        break;
      case 'manual':
        precioSimulado = precioManual(item);
        break;
    }

    return {
      ...item,
      precio_venta_simulado: precioSimulado,
      margen_simulado_pct: round2(margenPct(item.precio_lista, precioSimulado)),
    };
  });

  let sumCosto = 0;
  let sumVentaSim = 0;
  let sumAumentoPct = 0;
  let conVentaAnterior = 0;
  let margenBajo = 0;

  for (const it of itemsSimulados) {
    sumCosto += it.precio_lista;
    sumVentaSim += it.precio_venta_simulado;

    if (it.precio_venta_actual && it.precio_venta_actual > 0) {
      sumAumentoPct += ((it.precio_venta_simulado - it.precio_venta_actual) / it.precio_venta_actual) * 100;
      conVentaAnterior++;
    }

    if (it.margen_simulado_pct < MARGEN_BAJO_UMBRAL) {
      margenBajo++;
    }
  }

  return {
    items: itemsSimulados,
    resumen: {
      margen_global_simulado_pct: round2(sumCosto > 0 ? margenPct(sumCosto, sumVentaSim) : 0),
      aumento_promedio_publico_pct: round2(conVentaAnterior > 0 ? sumAumentoPct / conVentaAnterior : 0),
      items_margen_bajo: margenBajo,
      items_total: itemsSimulados.length,
    },
  };
}
