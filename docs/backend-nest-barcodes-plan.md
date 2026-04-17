# SmartStock — Plan Backend NestJS + Código de barras

## Objetivo

Definir una hoja de ruta para consolidar el backend en NestJS + PostgreSQL, mantener compatibilidad con el dominio actual de SmartStock y cerrar la brecha de código de barras (producto y fiscal ARCA) con foco en escalabilidad, consistencia y observabilidad.

---

## Hallazgos del estado actual (análisis del proyecto)

1. El dominio de producto usa `codigo` como identificador principal (stock, importador, pedidos, facturación, IA).
2. El importador ya interpreta aliases de barras (`barras`, `ean`, `upc`) pero los mapea al mismo campo `codigo`.
3. No existe todavía una entidad separada para códigos de barras por tipo (`EAN13`, `EAN8`, `UPC`, etc.).
4. El generador PDF actual muestra CAE y vencimiento, pero no renderiza código de barras fiscal.
5. El backlog ya exige esta capacidad en `V40-ARCA-008` (regenerar PDF con CAE + código de barras).
6. La cola ARCA asíncrona (`arca_job`, worker, cron endpoint, script worker) está implementada con stub de homologación y lista para conectar WSAA/WSFE real.

---

## Brecha técnica a resolver

### 1) Dominio de producto
- **Hoy:** `producto.codigo` concentra SKU/código interno y potencial código de barras.
- **Problema:** ambigüedad semántica, validaciones débiles, conflictos al importar desde múltiples proveedores.
- **Objetivo:** distinguir código interno de códigos de barras normalizados.

### 2) Dominio fiscal ARCA
- **Hoy:** CAE se persiste y el flujo asíncrono avanza, pero falta render fiscal completo.
- **Problema:** el PDF no cumple todavía con la entrega esperada de código de barras fiscal.
- **Objetivo:** generar cadena fiscal, dígito verificador, render en PDF y validación en homologación.

---

## Arquitectura objetivo (Backend NestJS)

## Principios
- Módulos por feature (`inventory`, `imports`, `invoicing`, `arca`, `tenancy`, `auth`).
- Separación `domain` / `application` / `infrastructure`.
- Reglas de negocio en casos de uso, no en controllers.
- Repositorios explícitos y transacciones en operaciones críticas.

## Estructura sugerida
- `src/modules/inventory`
- `src/modules/imports`
- `src/modules/invoicing`
- `src/modules/arca`
- `src/modules/shared` (errores, pipes, interceptors, observabilidad)

---

## Modelo de datos propuesto (evolución)

## Fase 1 (compatible, mínimo riesgo)
- Mantener `producto.codigo` como identificador interno funcional.
- Agregar `producto.codigo_barra_principal` nullable.
- Agregar constraint/validación de formato y longitud en capa aplicación.
- Índice recomendado: `(tenant_id, codigo_barra_principal)` parcial `WHERE activo = true`.

## Fase 2 (modelo completo)
- Crear tabla `producto_codigo_barra`:
  - `id`, `tenant_id`, `producto_id`
  - `tipo` (`ean13`, `ean8`, `upca`, `upce`, `otro`)
  - `valor_normalizado`
  - `es_principal`
  - `origen` (`manual`, `importacion_excel`, `ia_pdf`)
  - timestamps
- Restricciones:
  - único por tenant para evitar colisiones globales de catálogo.
  - único principal por producto.

---

## Algoritmos y reglas

## Validación de barras de producto
- Normalización: quitar espacios/guiones, conservar dígitos.
- Validar longitud por tipo y checksum cuando aplique.
- Resolver ambiguos con prioridad de tipo (`EAN13` > `EAN8` > `UPC` si no hay metadata).

## Resolución en importador
- Si viene `ean/upc/barras`, poblar `codigo_barra_principal` o `producto_codigo_barra`.
- Si viene `codigo` y no barras, mantener flujo actual para no romper compatibilidad.
- Registrar errores por fila cuando el checksum falle.

## Código de barras fiscal ARCA
- Construir cadena fiscal desde datos del comprobante + CAE.
- Calcular dígito verificador.
- Renderizar en PDF en bloque fiscal junto a CAE y vencimiento.
- Regenerar PDF una vez aprobado ARCA (flujo asíncrono worker).

---

## Integración con el flujo ARCA ya implementado

1. Emisión local crea comprobante.
2. Encolado `arca_job` marca `pendiente_arca`.
3. Worker procesa y obtiene CAE (stub hoy, WSFE real luego).
4. Al aprobar:
   - persistir `cae` y `cae_vencimiento`
   - regenerar PDF con código de barras fiscal
   - marcar job `completed`
5. Al fallar:
   - backoff/reintentos hasta `max_attempts`
   - transición final a `error_arca` si corresponde.

---

## Plan de ejecución (sprints)

## Sprint 1 — Base de datos y contratos
- Diseñar migración de `codigo_barra_principal` (o tabla dedicada si se decide directo).
- Definir DTOs Nest y contratos API para alta/edición/búsqueda por barras.
- Escribir tests de validación de checksum.

## Sprint 2 — Inventario e importador
- Implementar caso de uso `upsertBarcode`.
- Integrar mapeo del importador (`ean/upc/barras`) al nuevo modelo.
- Añadir búsqueda por código de barras en endpoints de producto.

## Sprint 3 — ARCA fiscal PDF
- Implementar generador de cadena fiscal + dígito verificador.
- Render barcode en PDF de comprobantes con CAE.
- Conectar regeneración al resultado exitoso del worker ARCA.

## Sprint 4 — Hardening
- Métricas por errores de barras y rechazos ARCA.
- Pruebas e2e con homologación.
- Checklist de producción y rollback plan.

---

## Criterios de aceptación global

- Se puede guardar y consultar código interno y código de barras sin ambigüedad.
- Importaciones con `ean/upc/barras` quedan normalizadas y trazables.
- Facturas con CAE incluyen código de barras fiscal en el PDF final.
- El flujo asíncrono ARCA mantiene estados consistentes (`pending`, `processing`, `completed`, `failed`).
- Existe cobertura de tests de validación, integración y regresión.

---

## Decisiones abiertas para cerrar con el equipo

1. ¿Evolución incremental (`codigo_barra_principal`) o modelo directo con tabla `producto_codigo_barra`?
2. ¿La unicidad del código de barras debe ser por tenant o global?
3. ¿Se habilita más de un barcode por producto desde la primera versión?
4. ¿Estrategia de coexistencia entre APIs actuales de Next y nuevo backend NestJS (proxy/BFF/gateway)?
