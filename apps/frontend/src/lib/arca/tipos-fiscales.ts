import type { Database } from '@/types/database';

export type TipoComprobante = Database['public']['Enums']['tipo_comprobante'];

/** Comprobantes que pueden requerir CAE vía ARCA (no remito ni presupuesto). */
export const TIPOS_COMPROBANTE_ARCA: readonly TipoComprobante[] = [
  'factura_a',
  'factura_b',
  'factura_c',
  'nota_credito_a',
  'nota_credito_b',
  'nota_credito_c',
] as const;

export function tipoRequiereArca(tipo: string): tipo is TipoComprobante {
  return (TIPOS_COMPROBANTE_ARCA as readonly string[]).includes(tipo);
}
