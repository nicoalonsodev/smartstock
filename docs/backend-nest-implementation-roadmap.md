# SmartStock — Backend NestJS (roadmap de implementación)

## Objetivo

Ejecutar la migración/evolución al backend NestJS de forma incremental, con riesgo controlado y entregables verificables por sprint.

---

## Sprint 0 — Preparación técnica

- Crear repo/paquete backend NestJS.
- Configurar `ConfigModule`, logger, error filter global, health checks.
- Definir estándar de módulos, DTOs, excepciones y testing.
- Publicar plantilla de módulo para el equipo.

**Salida esperada:** esqueleto productivo listo.

---

## Sprint 1 — Multi-tenant + Auth + Productos base

- Implementar auth JWT + guards + roles.
- Resolver tenant context en cada request.
- CRUD productos básico (sin romper frontend actual).
- Endpoint búsqueda por código.

**Tests:** unit + integración de aislamiento por tenant.

---

## Sprint 2 — Inventario y concurrencia

- Movimientos de stock con transacción.
- Locks (`FOR UPDATE`) para salidas y ajustes.
- Historial de movimientos paginado.
- Alertas stock bajo/vencimientos desde backend.

**Tests:** concurrencia y no-stock-negative.

---

## Sprint 3 — Modelo de código de barras

- Implementar fase elegida (`codigo_barra_principal` o tabla dedicada).
- Endpoints CRUD de barcode.
- Búsqueda por barcode en catálogo.
- Integración importador (`ean/upc/barras`).

**Tests:** checksum, unicidad, conflictos.

---

## Sprint 4 — Facturación core

- Emisión de comprobante con idempotencia.
- Integración con stock (descuento/devolución).
- Numeración robusta por tipo.
- PDF base con CAE cuando exista.

**Tests:** emisión, nota de crédito, presupuesto, duplicados.

---

## Sprint 5 — ARCA real + worker

- Integrar WSAA (ticket vigente).
- Integrar WSFE (solicitud CAE).
- Conectar cola `arca_job` ya existente.
- Regenerar PDF con bloque fiscal y código de barras.

**Tests:** homologación + reintentos + fallos de red.

---

## Sprint 6 — Observabilidad y hardening

- Métricas y dashboards técnicos.
- Alertas por error rate y latencia.
- SLO inicial por endpoints críticos.
- Performance tuning (índices, queries, paginación).

**Tests:** carga en endpoints críticos.

---

## Plan de adopción sin fricción

## Etapa A (coexistencia)
- Frontend sigue en Next.
- Se redirigen gradualmente rutas API a Nest.

## Etapa B (switch de dominio)
- Módulos estabilizados pasan 100% a Nest.
- Next conserva solo BFF mínimo o consume directo.

## Etapa C (consolidación)
- Desactivar rutas legacy.
- Mantener contrato de API versionado.

---

## Definition of Done por sprint

- Código + tests + docs + métricas mínimas.
- No regresión funcional en flujos existentes.
- Checklist de seguridad validada.
- PR aprobada por al menos 1 reviewer técnico.

---

## Riesgos y mitigación

- **Riesgo:** duplicidad de lógica Next/Nest.  
  **Mitigación:** mover módulo completo por vez, no endpoint suelto aislado.

- **Riesgo:** inconsistencias multi-tenant.  
  **Mitigación:** pruebas automatizadas de aislamiento en cada sprint.

- **Riesgo:** complejidad ARCA y homologación.  
  **Mitigación:** feature flags + worker stub solo en no-producción.
