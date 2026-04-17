import { describe, it, expect } from 'vitest';
import { parseBarcode } from '@/lib/pos/barcode-parser';

describe('parseBarcode', () => {
  describe('código de balanza (peso embebido)', () => {
    it('detecta un código de balanza estándar argentino', () => {
      // 2 0 00123 00450 X → PLU 00123, peso 450g (0.450 kg)
      const result = parseBarcode('2000123004501');
      expect(result.tipo).toBe('balanza_peso');
      expect(result.codigoLookup).toBe('00123');
      expect(result.pesoKg).toBe(0.45);
    });

    it('extrae PLU y peso correctamente (ejemplo 750 g)', () => {
      // 2 0 00001 00750 1 → PLU 00001, peso 750g (0.750 kg)
      const result = parseBarcode('2000001007501');
      expect(result.tipo).toBe('balanza_peso');
      expect(result.codigoLookup).toBe('00001');
      expect(result.pesoKg).toBe(0.75);
    });

    it('extrae PLU y peso máximos', () => {
      // 2 0 99999 12345 X → PLU 99999, peso 12345g (12.345 kg)
      const result = parseBarcode('2099999123450');
      expect(result.tipo).toBe('balanza_peso');
      expect(result.codigoLookup).toBe('99999');
      expect(result.pesoKg).toBe(12.345);
    });

    it('maneja peso 0', () => {
      const result = parseBarcode('2000123000000');
      expect(result.tipo).toBe('balanza_peso');
      expect(result.codigoLookup).toBe('00123');
      expect(result.pesoKg).toBe(0);
    });

    it('conserva el raw original', () => {
      const result = parseBarcode('2000123004501');
      expect(result.raw).toBe('2000123004501');
    });
  });

  describe('EAN normal', () => {
    it('detecta un EAN-13 estándar', () => {
      const result = parseBarcode('5449000000996');
      expect(result.tipo).toBe('ean_normal');
      expect(result.codigoLookup).toBe('5449000000996');
    });

    it('detecta un EAN-8', () => {
      const result = parseBarcode('96385074');
      expect(result.tipo).toBe('ean_normal');
      expect(result.codigoLookup).toBe('96385074');
    });

    it('detecta un ITF-14 (14 dígitos)', () => {
      const result = parseBarcode('15449000000993');
      expect(result.tipo).toBe('ean_normal');
      expect(result.codigoLookup).toBe('15449000000993');
    });

    it('acepta 8 a 14 dígitos numéricos', () => {
      expect(parseBarcode('12345678').tipo).toBe('ean_normal');
      expect(parseBarcode('123456789').tipo).toBe('ean_normal');
      expect(parseBarcode('1234567890').tipo).toBe('ean_normal');
      expect(parseBarcode('12345678901234').tipo).toBe('ean_normal');
    });
  });

  describe('SKU alfanumérico', () => {
    it('trata códigos alfanuméricos como ean_normal para lookup por SKU', () => {
      const result = parseBarcode('ABC-123');
      expect(result.tipo).toBe('ean_normal');
      expect(result.codigoLookup).toBe('ABC-123');
    });

    it('trata códigos cortos numéricos como ean_normal', () => {
      const result = parseBarcode('PROD001');
      expect(result.tipo).toBe('ean_normal');
      expect(result.codigoLookup).toBe('PROD001');
    });
  });

  describe('desconocido / inválido', () => {
    it('string vacío → desconocido', () => {
      const result = parseBarcode('');
      expect(result.tipo).toBe('desconocido');
      expect(result.codigoLookup).toBe('');
    });

    it('solo espacios → desconocido', () => {
      const result = parseBarcode('   ');
      expect(result.tipo).toBe('desconocido');
    });

    it('caracteres especiales → desconocido', () => {
      const result = parseBarcode('abc!@#');
      expect(result.tipo).toBe('desconocido');
    });
  });

  describe('trimming', () => {
    it('trimea espacios al inicio y final', () => {
      const result = parseBarcode('  5449000000996  ');
      expect(result.tipo).toBe('ean_normal');
      expect(result.codigoLookup).toBe('5449000000996');
    });
  });
});
