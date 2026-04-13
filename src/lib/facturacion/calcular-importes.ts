interface ItemComprobante {
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
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
 * - Factura A / NC A: subtotal neto + IVA discriminado = total
 * - Factura B/C, Remito, Presupuesto: total = subtotal (IVA incluido en precio)
 */
export function calcularImportes(
  items: ItemComprobante[],
  tipoComprobante: string,
  ivaPorcentaje: number = 21,
): Importes {
  const itemsCalculados = items.map((item) => ({
    ...item,
    subtotal: Math.round(item.cantidad * item.precio_unitario * 100) / 100,
  }));

  const subtotal = itemsCalculados.reduce((sum, item) => sum + item.subtotal, 0);
  const subtotalRedondeado = Math.round(subtotal * 100) / 100;

  const esFacturaA =
    tipoComprobante === 'factura_a' || tipoComprobante === 'nota_credito_a';

  if (esFacturaA) {
    const ivaMonto =
      Math.round(subtotalRedondeado * (ivaPorcentaje / 100) * 100) / 100;
    return {
      subtotal: subtotalRedondeado,
      iva_porcentaje: ivaPorcentaje,
      iva_monto: ivaMonto,
      total: Math.round((subtotalRedondeado + ivaMonto) * 100) / 100,
      items: itemsCalculados,
    };
  }

  return {
    subtotal: subtotalRedondeado,
    iva_porcentaje: ivaPorcentaje,
    iva_monto: 0,
    total: subtotalRedondeado,
    items: itemsCalculados,
  };
}
