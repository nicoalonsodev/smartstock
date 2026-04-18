/**
 * Calcula el precio de venta final (IVA incluido) de un producto a partir
 * del costo, el porcentaje de ganancia y el porcentaje de IVA.
 *
 * Fórmula:
 *   precio_venta = costo * (1 + ganancia/100) * (1 + iva/100)
 *
 * - Si `iva_porcentaje` es null/undefined se usa el `ivaDefault` del tenant.
 * - Si `costo` no es válido o <= 0, devuelve 0.
 * - El resultado se redondea a 2 decimales.
 */
export function calcularPrecioVenta(
  precioCosto: number | null | undefined,
  porcentajeGanancia: number | null | undefined,
  ivaPorcentaje: number | null | undefined,
  ivaDefault: number = 21,
): number {
  const costo = Number(precioCosto);
  if (!Number.isFinite(costo) || costo <= 0) return 0;

  const gananciaRaw = Number(porcentajeGanancia);
  const ganancia = Number.isFinite(gananciaRaw) ? gananciaRaw : 0;

  const ivaRaw = ivaPorcentaje == null ? NaN : Number(ivaPorcentaje);
  const iva = Number.isFinite(ivaRaw) ? ivaRaw : ivaDefault;

  const precio = costo * (1 + ganancia / 100) * (1 + iva / 100);
  return Math.round(precio * 100) / 100;
}
