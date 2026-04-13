import type { MapeoColumna } from '@/lib/normalizador/mapear';

/** Mapeo fijo para filas generadas por extracción IA (headers = claves en cada fila). */
export const MAPEO_IA_PREVIEW: MapeoColumna[] = [
  {
    headerOriginal: 'codigo',
    campoDetectado: 'codigo',
    confianza: 'exacta',
    ignorar: false,
  },
  {
    headerOriginal: 'nombre',
    campoDetectado: 'nombre',
    confianza: 'exacta',
    ignorar: false,
  },
  {
    headerOriginal: 'precio_venta',
    campoDetectado: 'precio_venta',
    confianza: 'exacta',
    ignorar: false,
  },
  {
    headerOriginal: 'precio_costo',
    campoDetectado: 'precio_costo',
    confianza: 'exacta',
    ignorar: false,
  },
  {
    headerOriginal: 'unidad',
    campoDetectado: 'unidad',
    confianza: 'exacta',
    ignorar: false,
  },
];
