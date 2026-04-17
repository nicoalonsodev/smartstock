/**
 * Parser for scanned barcode input.
 * Detects the barcode type and extracts lookup code + optional weight.
 * Shared between frontend (instant feedback) and backend (DB lookup).
 */

export type BarcodeTipo = 'ean_normal' | 'balanza_peso' | 'desconocido';

export interface BarcodeParseResult {
  tipo: BarcodeTipo;
  /** The code to look up in the database (barcode, PLU, or SKU) */
  codigoLookup: string;
  /** Weight in kg, only present when tipo === 'balanza_peso' */
  pesoKg?: number;
  /** Original raw input */
  raw: string;
}

/**
 * Parses a scanned barcode string and determines its type.
 *
 * Logic:
 * 1. If 13 numeric digits starting with '2' → scale barcode (peso embebido)
 *    following the Argentinian standard:
 *      Pos 1   → prefijo '2'    (ignorado)
 *      Pos 2   → relleno        (ignorado, normalmente '0')
 *      Pos 3-7 → PLU (5 dígitos)
 *      Pos 8-12→ peso en gramos (5 dígitos)
 *      Pos 13  → check digit    (ignorado)
 *    Ejemplo: 2000001007501 → PLU 00001, peso 750 g (0.750 kg).
 * 2. If 8-14 numeric digits → standard EAN barcode.
 * 3. If alphanumeric (non-empty) → treat as SKU lookup.
 * 4. Otherwise → unknown.
 */
export function parseBarcode(input: string): BarcodeParseResult {
  const trimmed = input.trim();

  if (!trimmed || /[^\w\-]/.test(trimmed)) {
    return { tipo: 'desconocido', codigoLookup: '', raw: input };
  }

  // Scale barcode: 13 digits starting with '2'
  if (/^\d{13}$/.test(trimmed) && trimmed[0] === '2') {
    const plu = trimmed.substring(2, 7);
    const pesoGramos = parseInt(trimmed.substring(7, 12), 10);
    const pesoKg = pesoGramos / 1000;

    return {
      tipo: 'balanza_peso',
      codigoLookup: plu,
      pesoKg,
      raw: input,
    };
  }

  // Standard EAN: 8-14 pure numeric digits
  if (/^\d{8,14}$/.test(trimmed)) {
    return { tipo: 'ean_normal', codigoLookup: trimmed, raw: input };
  }

  // Alphanumeric: treat as SKU for fallback lookup
  if (/^[\w\-]+$/.test(trimmed)) {
    return { tipo: 'ean_normal', codigoLookup: trimmed, raw: input };
  }

  return { tipo: 'desconocido', codigoLookup: '', raw: input };
}
