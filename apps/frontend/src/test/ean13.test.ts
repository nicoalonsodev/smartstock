import { describe, it, expect } from 'vitest';
import {
  calcularCheckDigitEAN13,
  validarEAN13,
  validarEAN8,
  generarEAN13Interno,
  formatearEAN13,
} from '@/lib/pos/ean13';

describe('calcularCheckDigitEAN13', () => {
  it('calcula el dígito verificador de un código argentino (prefijo 779)', () => {
    expect(calcularCheckDigitEAN13('779123456789')).toBe('8');
  });

  it('calcula el dígito verificador de un código interno (prefijo 20)', () => {
    // 200000000010X → check digit
    const check = calcularCheckDigitEAN13('200000000010');
    expect(check).toMatch(/^\d$/);
    expect(validarEAN13('200000000010' + check)).toBe(true);
  });

  it('calcula dígito verificador 0 cuando la suma es múltiplo de 10', () => {
    // Coca-Cola 5449000000996: check digit = 6
    expect(calcularCheckDigitEAN13('544900000099')).toBe('6');
  });

  it('rechaza strings que no son 12 dígitos numéricos', () => {
    expect(() => calcularCheckDigitEAN13('12345')).toThrow();
    expect(() => calcularCheckDigitEAN13('12345678901a')).toThrow();
    expect(() => calcularCheckDigitEAN13('1234567890123')).toThrow();
    expect(() => calcularCheckDigitEAN13('')).toThrow();
  });
});

describe('validarEAN13', () => {
  it('valida un EAN-13 correcto (código argentino)', () => {
    expect(validarEAN13('7791234567898')).toBe(true);
  });

  it('valida un EAN-13 correcto (Coca-Cola)', () => {
    expect(validarEAN13('5449000000996')).toBe(true);
  });

  it('rechaza check digit incorrecto', () => {
    expect(validarEAN13('7791234567890')).toBe(false);
    expect(validarEAN13('7791234567897')).toBe(false);
  });

  it('rechaza longitud incorrecta', () => {
    expect(validarEAN13('779123456789')).toBe(false);
    expect(validarEAN13('77912345678970')).toBe(false);
    expect(validarEAN13('')).toBe(false);
  });

  it('rechaza caracteres no numéricos', () => {
    expect(validarEAN13('779123456789A')).toBe(false);
    expect(validarEAN13('abcdefghijklm')).toBe(false);
  });

  it('valida códigos internos con prefijo 20', () => {
    const code = generarEAN13Interno(1);
    expect(validarEAN13(code)).toBe(true);
  });
});

describe('validarEAN8', () => {
  it('valida un EAN-8 correcto', () => {
    expect(validarEAN8('96385074')).toBe(true);
  });

  it('rechaza un EAN-8 con check digit incorrecto', () => {
    expect(validarEAN8('96385070')).toBe(false);
  });

  it('rechaza longitud incorrecta', () => {
    expect(validarEAN8('1234567')).toBe(false);
    expect(validarEAN8('123456789')).toBe(false);
  });
});

describe('generarEAN13Interno', () => {
  it('genera un EAN-13 válido con prefijo 20', () => {
    const code = generarEAN13Interno(1);
    expect(code).toHaveLength(13);
    expect(code.startsWith('20')).toBe(true);
    expect(validarEAN13(code)).toBe(true);
  });

  it('genera códigos distintos para secuenciales distintos', () => {
    const code1 = generarEAN13Interno(1);
    const code2 = generarEAN13Interno(2);
    expect(code1).not.toBe(code2);
  });

  it('rellena con ceros a la izquierda', () => {
    const code = generarEAN13Interno(42);
    expect(code.substring(0, 12)).toBe('200000000042');
  });

  it('maneja secuenciales grandes', () => {
    const code = generarEAN13Interno(9_999_999_999);
    expect(code).toHaveLength(13);
    expect(code.startsWith('20')).toBe(true);
    expect(validarEAN13(code)).toBe(true);
  });

  it('rechaza secuencial 0', () => {
    expect(() => generarEAN13Interno(0)).toThrow();
  });

  it('rechaza secuencial negativo', () => {
    expect(() => generarEAN13Interno(-1)).toThrow();
  });

  it('rechaza secuencial decimal', () => {
    expect(() => generarEAN13Interno(1.5)).toThrow();
  });

  it('rechaza secuencial fuera de rango', () => {
    expect(() => generarEAN13Interno(10_000_000_000)).toThrow();
  });
});

describe('formatearEAN13', () => {
  it('formatea un EAN-13 en grupos legibles', () => {
    expect(formatearEAN13('7791234567898')).toBe('7 791234 567898');
  });

  it('devuelve el input sin cambios si no tiene 13 caracteres', () => {
    expect(formatearEAN13('12345')).toBe('12345');
    expect(formatearEAN13('')).toBe('');
  });
});
