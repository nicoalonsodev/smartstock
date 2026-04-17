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

export const PROMPT_MATCHING_FUZZY = `Sos un asistente que relaciona items de una lista de proveedor con productos existentes en un sistema de stock.

Te doy dos listas en JSON:
1. "items": items de una lista de proveedor que todavía no se pudieron matchear por código exacto ni nombre exacto.
2. "productos": productos existentes del sistema.

Tu tarea es encontrar correspondencias probables. Usá tu criterio para detectar que un item y un producto son el mismo artículo aunque el nombre difiera levemente (abreviaciones, marcas, orden de palabras, etc.).

Devuelve ÚNICAMENTE un JSON válido con este formato:
{
  "matches": [
    {
      "item_id": "string (id del item)",
      "producto_id": "string (id del producto)",
      "confidence": number (entre 0.0 y 1.0),
      "razon": "string breve explicando por qué matchean"
    }
  ]
}

Reglas:
- Solo incluí matches donde tengas confianza razonable (>= 0.5)
- Preferí NO matchear antes que matchear mal (falso negativo > falso positivo)
- Un item puede matchear con UN solo producto
- Un producto puede matchear con UN solo item
- Si no encontrás match para un item, simplemente no lo incluyas
- confidence 0.9+ = muy seguro, 0.7-0.9 = probable, 0.5-0.7 = dudoso
- Si no hay ningún match posible, devolvé {"matches": []}`;

export const PROMPT_REPORTE_EJECUTIVO = `Sos un analista comercial que trabaja para una PyME argentina.
Te paso los datos de una lista de precios ya analizada. Generá un reporte ejecutivo breve y accionable.

Devuelve ÚNICAMENTE un JSON válido con este formato:
{
  "resumen": "string (2-3 oraciones con el panorama general)",
  "observaciones": ["string", ...],
  "recomendaciones": ["string", ...],
  "alertas": ["string", ...],
  "patron_proveedor": "string o null (si detectás un patrón de frecuencia o tipo de aumento)",
  "categorias_mas_afectadas": ["string", ...]
}

Reglas:
- Sé concreto y directo, sin jerga técnica excesiva
- Las alertas son para situaciones urgentes (caída de margen fuerte, aumento desproporcionado)
- Las recomendaciones deben ser accionables ("Renegociar X", "Subir precio de Y")
- Si hay datos de listas anteriores del mismo proveedor, compará tendencias
- Si no hay suficiente información para algún campo, usá un array vacío o null
- Máximo 5 items por array
- Todos los textos en español argentino`;
