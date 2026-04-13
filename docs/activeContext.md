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

1. **V01-INFRA-001 — Inicializar proyecto Next.js 14+ con estructura definitiva** (Estimación: 3 pts)
   Crear el proyecto con `create-next-app`, configurar TypeScript, Tailwind, estructura de carpetas `src/app/`, `src/lib/`, `src/components/`, `src/hooks/`, `src/types/`. Instalar dependencias base (`@supabase/supabase-js`, `@supabase/ssr`, `shadcn/ui`).

2. **V01-INFRA-002 — Configurar Supabase y variables de entorno** (Estimación: 2 pts)
   Crear proyecto en Supabase Dashboard, obtener URL + anon key + service role key. Configurar `.env.local` con las variables. Crear archivos `lib/supabase/client.ts` y `lib/supabase/server.ts` con los clients configurados.

3. **V01-INFRA-003 — Migraciones de base de datos (001→012)** (Estimación: 8 pts)
   Escribir y ejecutar las 12 migraciones en orden: enums → tenant → usuario → producto → movimiento → facturación → pedidos → importación → precios → arca → RLS → funciones. Habilitar extensiones `uuid-ossp`, `pgcrypto`, `moddatetime`.

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
| No hay proyecto Next.js creado todavía | Bloqueante | Ejecutar `create-next-app` como primer paso de desarrollo |
| No hay proyecto Supabase creado todavía | Bloqueante | Crear proyecto en Supabase Dashboard y obtener URL + keys |
| No se definió la librería UI | No bloqueante (se puede empezar sin ella) | Decidir antes de construir componentes del dashboard |

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
**Fase completada:** Fase 5 — TICKETS.md (79 tickets en 3 bloques: A=35 v0.1+v1.0, B=21 v1.5+v2.0, C=23 v3.0+v4.0)
**Siguiente paso:** Iniciar desarrollo con V01-INFRA-001 (crear proyecto Next.js)
