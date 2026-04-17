# SmartStock — Backend NestJS (estructura de datos y algoritmos)

## Objetivo

Establecer reglas de modelado, integridad y algoritmos para que el backend escale sin perder consistencia funcional ni aislamiento multi-tenant.

---

## Reglas de modelado de datos

## Convenciones base
- PK `uuid`.
- `tenant_id` en toda tabla de negocio.
- `created_at`, `updated_at`, `deleted_at` donde aplique.
- Soft-delete solo cuando aporte valor operativo.

## Integridad
- `NOT NULL` en campos críticos.
- `CHECK` para dominios numéricos (precios >= 0, stock >= 0).
- `UNIQUE` por tenant en claves de negocio.
- FKs con `ON DELETE` explícito.

## Índices mínimos
- `(tenant_id, created_at desc)` para listados recientes.
- `(tenant_id, estado)` para workflows.
- `(tenant_id, lower(codigo))` en producto.
- Índices parciales para alertas (`stock_bajo`, `vencimientos`).

---

## Modelo recomendado para código de barras

## Opción evolutiva corta
- Campo `codigo_barra_principal` en `producto`.
- Útil para salir rápido y compatibilizar importador.

## Opción objetivo (recomendada)
- Tabla `producto_codigo_barra`:
  - `id`, `tenant_id`, `producto_id`
  - `tipo` (`ean13`, `ean8`, `upca`, `upce`, `otro`)
  - `valor_normalizado`
  - `es_principal`
  - `origen`
  - timestamps

## Reglas de unicidad
- Un barcode no puede pertenecer a dos productos del mismo tenant.
- Un producto puede tener varios barcodes.
- Solo un barcode principal por producto.

---

## Algoritmos críticos

## 1) Normalización de códigos/barcodes
- Quitar separadores y espacios.
- Mantener dígitos válidos.
- Normalizar casing en códigos alfanuméricos.

## 2) Validación de checksum
- EAN-13/EAN-8/UPC con algoritmo de dígito verificador.
- Si checksum inválido:
  - rechazar si el campo fue explícitamente barcode,
  - advertir si proviene de una columna ambigua.

## 3) Upsert de importación
- Clave de resolución:
  1. barcode principal si existe,
  2. código interno,
  3. fallback por nombre (opcional y controlado).
- Reglas:
  - nunca mergear productos distintos por similitud de nombre sin confirmación.

## 4) Ledger de stock
- Movimiento inmutable por cada cambio.
- Lock de fila producto (`FOR UPDATE`) en operaciones concurrentes.
- Rechazo de salidas con stock negativo.

## 5) Numeración de comprobantes
- Secuencia por `tenant + tipo_comprobante`.
- Retry controlado ante conflicto de unicidad.

## 6) Cola ARCA
- Claim con `SKIP LOCKED`.
- Backoff exponencial con tope.
- Estado terminal tras `max_attempts`.

---

## Complejidad y escalabilidad

## Lecturas masivas
- Keyset pagination para listados grandes.
- Evitar offset profundo en tablas de alto volumen.

## Escrituras concurrentes
- Transacciones cortas.
- Idempotency key en endpoints críticos (`emitir`, `importar`, `procesar job`).

## Jobs asíncronos
- Jobs reentrantes.
- Reintentos idempotentes.
- Estado observable (`pending`, `processing`, `completed`, `failed`).

---

## Reglas de semántica de dominio

- `codigo`: identificador comercial/interno del negocio.
- `codigo_barra`: identificador de lectura óptica con reglas de formato/checksum.
- `stock_actual`: foto actual.
- `movimiento`: hecho histórico inmutable.
- `pendiente_arca`: estado transitorio recuperable.
- `error_arca`: estado terminal con intervención humana.

---

## Estrategia de migración segura

1. Agregar columnas/tablas nuevas sin romper APIs actuales.
2. Backfill progresivo (`codigo` -> `codigo_barra_principal` cuando corresponda).
3. Activar validaciones estrictas detrás de feature flag.
4. Ajustar importador y búsquedas.
5. Deprecar campos ambiguos solo cuando cobertura de datos sea completa.
