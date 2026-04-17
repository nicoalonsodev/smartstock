type CondicionIVA = 'responsable_inscripto' | 'monotributista' | 'exento' | 'consumidor_final';

/**
 * Determina el tipo de factura según la condición IVA del emisor (tenant)
 * y del receptor (cliente).
 *
 * - RI  → RI              = Factura A
 * - RI  → CF/Mono/Exento  = Factura B
 * - Mono/Exento → cualquiera = Factura C
 */
export function determinarTipoFactura(
  emisor: CondicionIVA,
  receptor: CondicionIVA,
): 'factura_a' | 'factura_b' | 'factura_c' {
  if (emisor === 'monotributista' || emisor === 'exento') {
    return 'factura_c';
  }

  if (emisor === 'responsable_inscripto') {
    if (receptor === 'responsable_inscripto') {
      return 'factura_a';
    }
    return 'factura_b';
  }

  // consumidor_final como emisor → Factura C (fallback)
  return 'factura_c';
}
