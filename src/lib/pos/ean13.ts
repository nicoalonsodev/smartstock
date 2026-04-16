/**
 * EAN-13 generation, validation and formatting utilities.
 * All functions are pure (no I/O, no state).
 */

const WEIGHTS = [1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3] as const;

/**
 * Calculates the GS1 check digit for the first 12 digits of an EAN-13.
 * Uses the standard modulo-10 algorithm with alternating weights 1-3.
 */
export function calcularCheckDigitEAN13(digits12: string): string {
  if (digits12.length !== 12 || !/^\d{12}$/.test(digits12)) {
    throw new Error('Se requieren exactamente 12 dígitos numéricos');
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits12[i], 10) * WEIGHTS[i];
  }

  const remainder = sum % 10;
  return remainder === 0 ? '0' : String(10 - remainder);
}

/**
 * Validates whether a string is a complete, valid EAN-13 code
 * (13 numeric digits with correct check digit).
 */
export function validarEAN13(code: string): boolean {
  if (code.length !== 13 || !/^\d{13}$/.test(code)) {
    return false;
  }

  const expectedCheck = calcularCheckDigitEAN13(code.substring(0, 12));
  return code[12] === expectedCheck;
}

/**
 * Validates whether a string is a valid EAN-8 code.
 */
export function validarEAN8(code: string): boolean {
  if (code.length !== 8 || !/^\d{8}$/.test(code)) {
    return false;
  }

  const weights8 = [3, 1, 3, 1, 3, 1, 3];
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    sum += parseInt(code[i], 10) * weights8[i];
  }

  const remainder = sum % 10;
  const expected = remainder === 0 ? '0' : String(10 - remainder);
  return code[7] === expected;
}

/**
 * Generates an internal EAN-13 using the GS1 internal-use prefix `20`.
 * @param secuencial - Sequential number (1 to 9999999999)
 * @returns A valid 13-digit EAN-13 string starting with "20"
 */
export function generarEAN13Interno(secuencial: number): string {
  if (secuencial < 1 || secuencial > 9_999_999_999 || !Number.isInteger(secuencial)) {
    throw new Error('El secuencial debe ser un entero entre 1 y 9999999999');
  }

  const body = '20' + String(secuencial).padStart(10, '0');
  return body + calcularCheckDigitEAN13(body);
}

/**
 * Formats an EAN-13 for human-readable display: `X XXXXXX XXXXXX`.
 * Non-13-digit inputs are returned as-is.
 */
export function formatearEAN13(code: string): string {
  if (code.length !== 13) return code;
  return `${code[0]} ${code.substring(1, 7)} ${code.substring(7, 13)}`;
}
