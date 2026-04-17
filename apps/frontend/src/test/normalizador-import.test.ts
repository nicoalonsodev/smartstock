import { describe, expect, it } from 'vitest';

import { mapearHeaders } from '@/lib/normalizador/mapear';
import { deduplicarFilas } from '@/lib/normalizador/deduplicar';
import { parsearPrecioArgentino, validarFilas } from '@/lib/normalizador/validar';

describe('Normalizador — mapeo de columnas', () => {
  it('detecta "COD ART" como codigo y "PVP" como precio_venta', () => {
    const mapeo = mapearHeaders(['COD ART', 'Nombre', 'PVP']);
    const porHeader = Object.fromEntries(mapeo.map((m) => [m.headerOriginal, m.campoDetectado]));
    expect(porHeader['COD ART']).toBe('codigo');
    expect(porHeader.PVP).toBe('precio_venta');
    expect(porHeader.Nombre).toBe('nombre');
  });
});

describe('Normalizador — precios (AR y US)', () => {
  it('parsea "$1.234,56" a 1234.56', () => {
    expect(parsearPrecioArgentino('$1.234,56')).toBe(1234.56);
  });

  it('parsea miles y centavos estilo US "$5,200.00" a 5200', () => {
    expect(parsearPrecioArgentino('$5,200.00')).toBe(5200);
    expect(parsearPrecioArgentino('"$5,200.00"')).toBe(5200);
  });

  it('parsea "5.200" (miles AR) a 5200', () => {
    expect(parsearPrecioArgentino('5.200')).toBe(5200);
  });
});

describe('Normalizador — deduplicación', () => {
  it('conserva la última fila válida con el mismo código', () => {
    const mapeo = [
      {
        headerOriginal: 'codigo',
        campoDetectado: 'codigo' as const,
        ignorar: false,
      },
      {
        headerOriginal: 'nombre',
        campoDetectado: 'nombre' as const,
        ignorar: false,
      },
      {
        headerOriginal: 'pvp',
        campoDetectado: 'precio_venta' as const,
        ignorar: false,
      },
    ];

    const filas = [
      { codigo: 'A', nombre: 'Primera', pvp: '100' },
      { codigo: 'A', nombre: 'Segunda', pvp: '200' },
    ];

    const validadas = validarFilas(filas, mapeo);
    expect(validadas.every((v) => v.valida)).toBe(true);

    const { unicas, duplicadasDescartadas } = deduplicarFilas(validadas);
    expect(duplicadasDescartadas).toBe(1);
    expect(unicas).toHaveLength(1);
    expect(unicas[0].datos.nombre).toBe('Segunda');
    expect(unicas[0].datos.precio_venta).toBe(200);
  });
});
