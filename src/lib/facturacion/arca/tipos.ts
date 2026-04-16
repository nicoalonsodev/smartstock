export const TIPO_COMPROBANTE_ARCA: Record<string, number> = {
  factura_a: 1,
  factura_b: 6,
  factura_c: 11,
  nota_credito_a: 3,
  nota_credito_b: 8,
  nota_credito_c: 13,
};

export const TIPO_DOC_RECEPTOR: Record<string, number> = {
  CUIT: 80,
  CUIL: 86,
  CDI: 87,
  DNI: 96,
  SIN_IDENTIFICAR: 99,
};

export const CONCEPTO = {
  PRODUCTOS: 1,
  SERVICIOS: 2,
  PRODUCTOS_Y_SERVICIOS: 3,
} as const;

export function mapTipoComprobante(tipo: string): number {
  const codigo = TIPO_COMPROBANTE_ARCA[tipo];
  if (!codigo) throw new Error(`Tipo de comprobante no soportado por ARCA: ${tipo}`);
  return codigo;
}

export function mapTipoDocReceptor(cuitDni: string | null): { tipo: number; nro: string } {
  if (!cuitDni) return { tipo: 99, nro: '0' };

  const limpio = cuitDni.replace(/[-\s]/g, '');

  if (limpio.length === 11) return { tipo: 80, nro: limpio };
  if (limpio.length === 8 || limpio.length === 7) return { tipo: 96, nro: limpio };

  return { tipo: 99, nro: '0' };
}
