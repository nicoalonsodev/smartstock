export const PROMPT_EXTRACCION_PRECIOS = `Analiza este documento que contiene una lista de precios de un proveedor.
Extrae TODOS los productos que encuentres en una tabla.

Devuelve ÚNICAMENTE un JSON válido con el siguiente formato, sin texto adicional:
{
  "productos": [
    {
      "codigo": "string o null",
      "nombre": "string",
      "precio": number,
      "unidad": "string o null"
    }
  ]
}

Reglas:
- Si no hay código visible, usa null
- El precio debe ser un número (sin símbolos de moneda)
- Si hay varios precios (costo, lista, oferta), usa el precio de lista
- Ignora encabezados, logos y texto que no sea parte de la tabla de productos
- Si hay categorías o secciones, incluye el nombre del producto completo
- Respetá la ortografía original del documento
- No inventes productos que no estén en el documento
- Si no podés extraer ningún producto, devolvé {"productos": []}`;

export const PROMPT_EXTRACCION_CON_COSTO = `Analiza este documento que contiene una lista de precios de un proveedor.
Extrae TODOS los productos que encuentres.

Devuelve ÚNICAMENTE un JSON válido con el siguiente formato, sin texto adicional:
{
  "productos": [
    {
      "codigo": "string o null",
      "nombre": "string",
      "precio_costo": number o null,
      "precio_venta": number o null,
      "unidad": "string o null"
    }
  ]
}

Reglas:
- Si no hay código visible, usa null
- Los precios deben ser números (sin símbolos de moneda)
- Si el documento tiene un solo precio por producto, asumí que es precio de lista (precio_venta) y dejá precio_costo como null
- Si tiene dos precios (ej: "neto" y "lista"), el menor es costo y el mayor es venta
- Ignora encabezados, logos y texto decorativo
- Si hay categorías o secciones, incluí el nombre del producto completo
- No inventes productos que no estén en el documento`;
