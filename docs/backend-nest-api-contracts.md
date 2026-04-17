# SmartStock — Backend NestJS (contratos API)

## Objetivo

Definir contratos API consistentes para módulos core, con versionado, validación de entrada y respuestas estandarizadas.

---

## Convenciones globales

- Prefijo: `/api/v1`.
- Auth: `Authorization: Bearer <token>`.
- Contexto tenant: desde JWT (no confiar en `tenant_id` enviado por cliente).
- `Content-Type: application/json`.

## Formato de respuesta

## Éxito
```json
{
  "data": {},
  "meta": {
    "requestId": "uuid",
    "timestamp": "2026-04-17T10:00:00.000Z"
  }
}
```

## Error
```json
{
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Producto no encontrado",
    "details": {}
  },
  "meta": {
    "requestId": "uuid",
    "timestamp": "2026-04-17T10:00:00.000Z"
  }
}
```

---

## Endpoints core recomendados

## Productos
- `GET /api/v1/products`
- `POST /api/v1/products`
- `GET /api/v1/products/:id`
- `PATCH /api/v1/products/:id`

### Query params sugeridos
- `q`, `categoryId`, `supplierId`, `barcode`, `page`, `pageSize`, `sort`.

## Códigos de barra
- `POST /api/v1/products/:id/barcodes`
- `PATCH /api/v1/products/:id/barcodes/:barcodeId`
- `DELETE /api/v1/products/:id/barcodes/:barcodeId`
- `PATCH /api/v1/products/:id/barcodes/:barcodeId/set-primary`

## Movimientos
- `POST /api/v1/inventory/movements`
- `GET /api/v1/inventory/movements`

## Importaciones
- `POST /api/v1/imports/preview`
- `POST /api/v1/imports/execute`

## Facturación
- `POST /api/v1/invoices/emit`
- `GET /api/v1/invoices`
- `GET /api/v1/invoices/:id`

## ARCA
- `POST /api/v1/arca/config`
- `POST /api/v1/arca/invoices/:id/enqueue`
- `POST /api/v1/arca/worker/process-batch` (interno/cron)

---

## DTOs base (resumen)

## `CreateProductDto`
- `codigo` string required
- `nombre` string required
- `precioCosto` number >= 0
- `precioVenta` number >= 0
- `stockMinimo` integer >= 0
- `codigoBarraPrincipal` optional

## `AddBarcodeDto`
- `tipo` enum
- `valor` string required
- `esPrincipal` boolean optional

## `CreateMovementDto`
- `productoId` uuid
- `tipo` enum `entrada|salida|ajuste`
- `cantidad` integer > 0
- `motivo` optional

## `EmitInvoiceDto`
- `clienteId` uuid
- `tipo` enum comprobante
- `items[]` con `productoId`, `cantidad`, `precioUnitario`
- `notas` optional

---

## Versionado y compatibilidad

- Versionar desde el inicio (`/v1`).
- Cambios breaking solo en `/v2`.
- Campos nuevos siempre opcionales primero.
- Publicar changelog API por sprint.

---

## Idempotencia

Aplicar `Idempotency-Key` en:
- emisión de comprobantes,
- ejecución de importaciones,
- encolado ARCA.

Regla: misma key + mismo payload = misma respuesta funcional.

---

## Seguridad y límites

- Rate limit por endpoint sensible.
- Validación DTO global (`whitelist: true`, `forbidNonWhitelisted: true`).
- Sanitización de strings de entrada.
- Logs sin secretos ni datos sensibles de certificados.

---

## OpenAPI

- Documentar todo con `@nestjs/swagger`.
- Generar colección para QA y frontend.
- Definir ejemplos por endpoint para casos felices y de error.
