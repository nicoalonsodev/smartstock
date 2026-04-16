import { describe, it, expect } from 'vitest';

import { calcularCheckDigitEAN13, validarEAN13, validarEAN8, generarEAN13Interno, formatearEAN13 } from '@/lib/pos/ean13';
import { parseBarcode } from '@/lib/pos/barcode-parser';

describe('POS integration tests', () => {
  describe('EAN-13 — check digit calculation', () => {
    it('calculates correct check digit for standard EAN-13', () => {
      expect(calcularCheckDigitEAN13('544900000099')).toBe('6');
    });

    it('calculates correct check digit for prefix 20 (internal)', () => {
      const code = generarEAN13Interno(1);
      expect(code).toHaveLength(13);
      expect(code.startsWith('20')).toBe(true);
      expect(validarEAN13(code)).toBe(true);
    });
  });

  describe('EAN-13 — validation', () => {
    it('valid EAN-13 passes', () => {
      const code = generarEAN13Interno(42);
      expect(validarEAN13(code)).toBe(true);
    });

    it('invalid EAN-13 (wrong digit) fails', () => {
      const code = generarEAN13Interno(42);
      const tampered = code.slice(0, 12) + ((parseInt(code[12]) + 1) % 10);
      expect(validarEAN13(tampered)).toBe(false);
    });

    it('rejects non-13-digit strings', () => {
      expect(validarEAN13('123')).toBe(false);
      expect(validarEAN13('12345678901234')).toBe(false);
      expect(validarEAN13('abcdefghijklm')).toBe(false);
    });
  });

  describe('EAN-8 — validation', () => {
    it('valid EAN-8 passes', () => {
      expect(validarEAN8('96385074')).toBe(true);
    });

    it('invalid EAN-8 fails', () => {
      expect(validarEAN8('96385075')).toBe(false);
    });

    it('rejects wrong length', () => {
      expect(validarEAN8('1234567')).toBe(false);
      expect(validarEAN8('123456789')).toBe(false);
    });
  });

  describe('EAN-13 — internal generation', () => {
    it('generates sequential codes with prefix 20', () => {
      const code1 = generarEAN13Interno(1);
      const code2 = generarEAN13Interno(2);
      expect(code1).not.toBe(code2);
      expect(code1.startsWith('20')).toBe(true);
      expect(code2.startsWith('20')).toBe(true);
    });

    it('all generated codes are valid', () => {
      for (let i = 1; i <= 100; i++) {
        const code = generarEAN13Interno(i);
        expect(validarEAN13(code)).toBe(true);
      }
    });

    it('supports large sequential numbers', () => {
      const code = generarEAN13Interno(9999999999);
      expect(validarEAN13(code)).toBe(true);
    });
  });

  describe('EAN-13 — formatting', () => {
    it('formats with spaces: X XXXXXX XXXXXX', () => {
      const formatted = formatearEAN13('5449000000996');
      expect(formatted).toBe('5 449000 000996');
    });

    it('returns original if not 13 digits', () => {
      expect(formatearEAN13('12345678')).toBe('12345678');
    });
  });

  describe('Barcode parser — scale barcodes', () => {
    it('parses scale barcode with valid PLU and weight', () => {
      const result = parseBarcode('2001230045007');
      expect(result.tipo).toBe('balanza_peso');
      expect(result.codigoLookup).toBe('00123');
      expect(result.pesoKg).toBeCloseTo(0.45);
    });

    it('handles maximum weight (99.999 kg)', () => {
      const result = parseBarcode('2000009999907');
      expect(result.tipo).toBe('balanza_peso');
      expect(result.pesoKg).toBeCloseTo(99.999);
    });

    it('handles zero weight', () => {
      const result = parseBarcode('2001230000007');
      expect(result.tipo).toBe('balanza_peso');
      expect(result.pesoKg).toBe(0);
    });
  });

  describe('Barcode parser — normal EANs', () => {
    it('parses EAN-13 starting with non-2 as normal', () => {
      const result = parseBarcode('5449000000996');
      expect(result.tipo).toBe('ean_normal');
      expect(result.codigoLookup).toBe('5449000000996');
    });

    it('parses EAN-8', () => {
      const result = parseBarcode('96385074');
      expect(result.tipo).toBe('ean_normal');
    });
  });

  describe('Barcode parser — SKU fallback', () => {
    it('treats alphanumeric strings as ean_normal for SKU lookup', () => {
      const result = parseBarcode('ABC-123');
      expect(result.tipo).toBe('ean_normal');
      expect(result.codigoLookup).toBe('ABC-123');
    });
  });

  describe('Barcode parser — invalid inputs', () => {
    it('empty string → desconocido', () => {
      expect(parseBarcode('').tipo).toBe('desconocido');
    });

    it('special characters → desconocido', () => {
      expect(parseBarcode('abc!@#').tipo).toBe('desconocido');
    });

    it('whitespace only → desconocido', () => {
      expect(parseBarcode('   ').tipo).toBe('desconocido');
    });
  });

  describe('Vuelto calculation', () => {
    it('calculates correct change for cash payment', () => {
      const total = 1500.50;
      const recibido = 2000;
      const vuelto = Math.round((recibido - total) * 100) / 100;
      expect(vuelto).toBe(499.50);
    });

    it('no change when exact amount', () => {
      const total = 1500;
      const recibido = 1500;
      const vuelto = Math.round((recibido - total) * 100) / 100;
      expect(vuelto).toBe(0);
    });
  });

  describe('Mixed payment validation', () => {
    it('valid when sum equals total', () => {
      const total = 1000;
      const detalle = { efectivo: 500, debito: 500, credito: 0, transferencia: 0 };
      const suma = Object.values(detalle).reduce((s, v) => s + v, 0);
      expect(Math.abs(suma - total)).toBeLessThan(0.01);
    });

    it('invalid when sum does not match total', () => {
      const total = 1000;
      const detalle = { efectivo: 400, debito: 500, credito: 0, transferencia: 0 };
      const suma = Object.values(detalle).reduce((s, v) => s + v, 0);
      expect(Math.abs(suma - total)).toBeGreaterThan(0.01);
    });
  });
});
