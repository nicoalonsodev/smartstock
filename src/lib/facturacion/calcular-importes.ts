interface ItemComprobante {
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  iva_porcentaje?: number | null;
}

interface Importes {
  subtotal: number;
  iva_porcentaje: number;
  iva_monto: number;
  total: number;
  items: (ItemComprobante & { subtotal: number })[];
}

/**
 * Calcula importes de un comprobante.
 *
 * - Factura / NC: subtotal neto + IVA discriminado por producto = total
 * - Ticket, Remito, Presupuesto: total = subtotal (IVA incluido en precio)
 *
 * Each item can carry its own iva_porcentaje; falls back to ivaPorcentajeDefault.
 */
export function calcularImportes(
  items: ItemComprobante[],
  tipoComprobante: string,
  ivaPorcentajeDefault: number = 21,
): Importes {
  const itemsCalculados = items.map((item) => ({
    ...item,
    subtotal: Math.round(item.cantidad * item.precio_unitario * 100) / 100,
  }));

  const subtotal = itemsCalculados.reduce((sum, item) => sum + item.subtotal, 0);
  const subtotalRedondeado = Math.round(subtotal * 100) / 100;

  const esFactura =
    tipoComprobante === 'factura_a' ||
    tipoComprobante === 'nota_credito_a' ||
    tipoComprobante === 'factura' ||
    tipoComprobante === 'nota_credito';

  if (esFactura) {
    let ivaMonto = 0;
    for (const item of itemsCalculados) {
      const rate = item.iva_porcentaje ?? ivaPorcentajeDefault;
      ivaMonto += Math.round(item.subtotal * (rate / 100) * 100) / 100;
    }
    ivaMonto = Math.round(ivaMonto * 100) / 100;

    const rateUsed = itemsCalculados.length === 1
      ? (itemsCalculados[0].iva_porcentaje ?? ivaPorcentajeDefault)
      : ivaPorcentajeDefault;

    return {
      subtotal: subtotalRedondeado,
      iva_porcentaje: rateUsed,
      iva_monto: ivaMonto,
      total: Math.round((subtotalRedondeado + ivaMonto) * 100) / 100,
      items: itemsCalculados,
    };
  }

  return {
    subtotal: subtotalRedondeado,
    iva_porcentaje: ivaPorcentajeDefault,
    iva_monto: 0,
    total: subtotalRedondeado,
    items: itemsCalculados,
  };
}
