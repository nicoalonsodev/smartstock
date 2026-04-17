---
estado: 🔴 Pendiente
version: v0.1
ultima_actualizacion: 2026-04-13
---

# SmartStock — Contexto activo

## Qué estamos construyendo ahora

**Versión v0.1 — Fundaciones**

El objetivo de esta versión es levantar toda la infraestructura base del proyecto para que el desarrollo de features de negocio pueda avanzar sin fricciones. Esto incluye:

- Proyecto Next.js 14+ con App Router, TypeScript y Tailwind CSS, con la estructura de carpetas definitiva.
- Supabase configurado: proyecto creado, todas las migraciones de base de datos ejecutadas (001 → 012), extensiones habilitadas, ENUMs definidos.
- Autenticación funcionando: registro de nuevo tenant (crea tenant + usuario admin), login con email/password, middleware de sesión que protege rutas del dashboard.
- Multi-tenancy operativo: `custom_access_token_hook` inyecta `tenant_id` en el JWT, `auth.tenant_id()` lo extrae, RLS policies activas en las 16 tablas.
- Seed con datos de prueba: al menos 2 tenants con productos, categorías y proveedores para testear aislamiento.
- Dashboard vacío pero funcional: el usuario se loguea y ve la estructura de la app (sidebar, header, página principal).

**Criterio de cierre:** un usuario se registra, loguea y ve un dashboard vacío. Un segundo usuario de otro tenant no ve los datos del primero.

---

## Próximos 3 tickets a trabajar

1. **V40-ARCA-001 — Configuración ARCA (certificados y datos)** (Estimación: 5 pts)
   Página `/configuracion/arca` y crypto según `arca.md`.

2. **V40-ARCA-002 — Implementar WSAA** (Estimación: 8 pts)
   Firma CMS, SOAP WSAA, ticket en `arca_config`.

3. **V40-ARCA-003 — Renovación automática de ticket WSAA** (Estimación: 3 pts)
   `asegurarTicketVigente` antes de WSFE.

## Línea técnica paralela (documentada)

- Se agregó el documento `backend-nest-barcodes-plan.md` para planificar la evolución a backend NestJS + PostgreSQL con foco en:
  - separación semántica entre código interno y código de barras de producto,
  - validaciones y normalización EAN/UPC en importador y catálogo,
  - cierre del faltante de código de barras fiscal en PDF cuando ARCA aprueba CAE.
- Se agregaron además documentos complementarios para cubrir backend completo:
  - `backend-nest-architecture.md`
  - `backend-nest-data-algorithms.md`
  - `backend-nest-api-contracts.md`
  - `backend-nest-implementation-roadmap.md`
  - `backend-nest-tickets.md` (incluye workflow Git por ticket y pipeline `migration:generate` + `build` + `migration:run`)

---

## Decisiones pendientes de tomar

| Decisión | Opciones | Contexto |
|---|---|---|
| Librería de componentes UI | shadcn/ui vs Radix + custom vs otra | shadcn/ui es la opción más alineada con Next.js + Tailwind. Decidir antes de construir el primer componente |
| Manejo de estado del cliente | React Query (TanStack) vs SWR vs solo server components | Para v0.1 probablemente alcanza con server components puros. Evaluar cuando aparezcan necesidades de cache/mutation en cliente |
| Package manager | npm vs pnpm | pnpm es más rápido y eficiente en disco. Decidir al crear el proyecto |
| Estrategia de testing | Vitest + Testing Library vs Jest + Testing Library | Vitest es más moderno y rápido con Vite. Decidir antes de escribir el primer test |
| Supabase local vs remoto para desarrollo | Supabase CLI local (Docker) vs proyecto remoto | Local es más rápido para iterar migraciones. Remoto es necesario para Auth hooks. Se pueden usar ambos |
| `tenant_id` en tablas hijas | Subquery en RLS vs agregar columna redundante | Subquery es más simple, columna redundante es más rápida. Decidir antes de v1.5 (facturación) |

---

## Bloqueos actuales

| Bloqueo | Estado | Acción requerida |
|---|---|---|
| Hook JWT en Dashboard (V01-DB-003 / V01-AUTH-006) | Necesario para `tenant_id` en sesión | Registrar `custom_access_token_hook` en Supabase |
| No se definió la librería UI | Resuelto para v0.1 | shadcn/ui instalado (V01-INFRA-002) |

---

## Documentación completada

| Fase | Archivos | Estado |
|---|---|---|
| Fase 1 — Memory Bank base | `README.md`, `arquitectura.md`, `activeContext.md` | Completada |
| Fase 2 — DB y multi-tenancy | `base-de-datos.md`, `multi-tenancy.md`, `autenticacion.md` | Completada |
| Fase 3 — Módulos de negocio (par 1) | `modulos.md`, `stock.md` | Completada |
| Fase 3 — Módulos de negocio (par 2) | `importador.md`, `facturacion.md` | Completada |
| Fase 3 — Módulos de negocio (par 3) | `pedidos.md`, `ia-precios.md` | Completada |
| Fase 4 — ARCA y deploy | `arca.md`, `deploy.md` | Completada |
| Fase 5 — Tickets | `TICKETS.md` | Completada (79 tickets) |

---

## Última actualización

**Fecha:** 2026-04-13
**Último ticket completado:** V30-IA-006 — Límite mensual de extracciones IA por tenant
**Siguiente paso:** V40-ARCA-001 — Configuración ARCA (certificados y datos)
