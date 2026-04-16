---
estado: 🟡 En progreso
version: v0.1
ultima_actualizacion: 2026-04-13
---

# SmartStock — Backlog de tickets

---

# BLOQUE A — v0.1 (Fundaciones) y v1.0 (Stock + Importador)

---

## V01-INFRA-001 — Inicializar proyecto Next.js con estructura de carpetas (hecho)

- Tipo: setup
- Módulo: infra
- Prioridad: critical
- Estimación: 2
- Versión: v0.1
- Estado: done ✅
- Dependencias: ninguna

**Descripción:** Crear el proyecto con `create-next-app` usando App Router, TypeScript y Tailwind CSS. Establecer la estructura de carpetas definitiva (`src/app/`, `src/lib/`, `src/components/`, `src/hooks/`, `src/types/`).

**Criterios de aceptación:**
- [x] Proyecto creado con `npx create-next-app@latest --typescript --tailwind --app --src-dir`
- [x] Estructura de carpetas según `arquitectura.md`: `(auth)/`, `(dashboard)/`, `api/`, `lib/`, `components/`, `hooks/`, `types/`
- [x] `npm run dev` levanta sin errores en `localhost:3000`
- [x] `npm run build` compila sin errores de TypeScript

**Notas técnicas:** Usar pnpm o npm según decisión del equipo. Configurar `tsconfig.json` con paths alias `@/`.

---

## V01-INFRA-002 — Instalar dependencias base del proyecto (hecho)

- Tipo: setup
- Módulo: infra
- Prioridad: critical
- Estimación: 1
- Versión: v0.1
- Estado: done ✅
- Dependencias: V01-INFRA-001

**Descripción:** Instalar las dependencias iniciales necesarias para Supabase, componentes UI y utilidades.

**Criterios de aceptación:**
- [x] `@supabase/supabase-js` y `@supabase/ssr` instalados
- [x] Librería UI elegida instalada (shadcn/ui recomendado) con al menos button, input, select, dialog, table
- [x] `lucide-react` instalado para iconos
- [x] `package.json` tiene scripts `dev`, `build`, `start`, `lint`

**Notas técnicas:** Si se elige shadcn/ui, ejecutar `npx shadcn-ui@latest init` y agregar componentes base.

---

## V01-INFRA-003 — Crear proyecto Supabase y obtener credenciales (hecho)

- Tipo: setup
- Módulo: infra
- Prioridad: critical
- Estimación: 1
- Versión: v0.1
- Estado: done
- Dependencias: ninguna

**Descripción:** Crear el proyecto en Supabase Dashboard, obtener URL y keys, configurar `.env.local`.

**Criterios de aceptación:**
- [ ] Proyecto creado en Supabase (región cercana a Argentina)
- [ ] `.env.local` creado con `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_ScERVICE_ROLE_KEY`
- [ ] `.env.local` agregado a `.gitignore`
- [ ] `.env.local.example` creado con los nombres de variables sin valores

**Notas técnicas:** Vincular con `supabase link --project-ref <ref>`.

---

## V01-DB-001 — Migración 001: extensiones y ENUMs (hecho)

- Tipo: migration
- Módulo: infra
- Prioridad: critical
- Estimación: 2
- Versión: v0.1
- Estado: done
- Dependencias: V01-INFRA-003

**Descripción:** Crear la primera migración con las extensiones PostgreSQL requeridas y todos los tipos enumerados del sistema.

**Criterios de aceptación:**
- [ ] Archivo `supabase/migrations/001_enums.sql` creado
- [ ] Extensiones `uuid-ossp`, `pgcrypto`, `moddatetime` habilitadas
- [ ] Los 11 ENUMs creados: `condicion_iva`, `rol_usuario`, `unidad_medida`, `tipo_movimiento`, `referencia_tipo`, `tipo_comprobante`, `estado_comprobante`, `estado_pedido`, `plan_tipo`, `arca_ambiente`, `origen_precio`
- [ ] `supabase db push` ejecuta sin errores

**Notas técnicas:** SQL completo en `base-de-datos.md` sección ENUMs.

---

## V01-DB-002 — Migraciones 002-010: todas las tablas (hecho)

- Tipo: migration
- Módulo: infra
- Prioridad: critical
- Estimación: 5
- Versión: v0.1
- Estado: done
- Dependencias: V01-DB-001

**Descripción:** Crear las migraciones 002 a 010 con todas las tablas del sistema, triggers, índices y constraints.

**Criterios de aceptación:**
- [ ] Migración 002: tabla `tenant` con trigger y índice
- [ ] Migración 003: tabla `usuario` con FK a `auth.users` y `tenant`
- [ ] Migración 004: tablas `categoria`, `proveedor`, `producto` con todos sus índices y constraints
- [ ] Migración 005: tabla `movimiento`
- [ ] Migración 006: tablas `cliente`, `comprobante`, `comprobante_item`
- [ ] Migración 007: tablas `pedido`, `pedido_item`
- [ ] Migración 008: tabla `importacion_log`
- [ ] Migración 009: tabla `precio_historial`
- [ ] Migración 010: tablas `arca_config`, `arca_log`
- [ ] Todas las migraciones ejecutan en orden con `supabase db push`

**Notas técnicas:** SQL completo en `base-de-datos.md`. Respetar el orden estricto de dependencias.

---

## V01-DB-003 — Migración 011: RLS y funciones de auth (hecho)

- Tipo: migration
- Módulo: auth
- Prioridad: critical
- Estimación: 3
- Versión: v0.1
- Estado: done
- Dependencias: V01-DB-002

**Descripción:** Habilitar RLS en las 16 tablas, crear las policies SELECT/INSERT/UPDATE/DELETE, y las funciones `custom_access_token_hook` y `auth.tenant_id()`.

**Criterios de aceptación:**
- [ ] `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` en las 16 tablas
- [ ] 4 policies (select, insert, update, delete) por cada tabla con `tenant_id` directo
- [ ] Policies con subquery para `comprobante_item` y `pedido_item`
- [ ] Función `public.custom_access_token_hook` creada con permisos para `supabase_auth_admin`
- [ ] Función `auth.tenant_id()` creada
- [ ] Grants y revokes correctos

**Notas técnicas:** SQL completo en `multi-tenancy.md`. Después de ejecutar, registrar el hook manualmente en Supabase Dashboard.

---

## V01-DB-004 — Migración 012: funciones de negocio (hecho)

- Tipo: migration
- Módulo: infra
- Prioridad: critical
- Estimación: 2
- Versión: v0.1
- Estado: done
- Dependencias: V01-DB-003

**Descripción:** Crear las funciones SQL `registrar_movimiento` y `siguiente_numero_comprobante`.

**Criterios de aceptación:**
- [ ] Función `registrar_movimiento` creada con `SECURITY DEFINER`
- [ ] Función `siguiente_numero_comprobante` creada con `SECURITY DEFINER`
- [ ] Ambas funciones ejecutan correctamente desde un RPC de Supabase
- [ ] Tests manuales: entrada suma stock, salida resta, ajuste establece, salida con stock insuficiente lanza error

**Notas técnicas:** SQL completo en `base-de-datos.md`.

---

## V01-DB-005 — Seed con datos de prueba para 2 tenants (hecho)

- Tipo: setup
- Módulo: infra
- Prioridad: high
- Estimación: 3
- Versión: v0.1
- Estado: done
- Dependencias: V01-DB-004

**Descripción:** Crear `supabase/seed.sql` con datos de prueba para 2 tenants distintos: cada uno con productos, categorías, proveedores. Sirve para testear aislamiento RLS.

**Criterios de aceptación:**
- [x] Tenant A: "Almacén Don Pedro" con 10 productos, 3 categorías, 2 proveedores, plan base
- [x] Tenant B: "Distribuidora López" con 15 productos, 5 categorías, 3 proveedores, plan completo
- [x] `modulo_config` creado para cada tenant con módulos según plan
- [x] Al menos 5 movimientos de stock por tenant
- [x] `supabase seed` (local) / seed en `db reset` ejecuta sin errores — ver `supabase/config.toml` → `[db.seed]`
- [x] Los datos respetan constraints y son realistas (nombres, precios, stocks argentinos)

**Notas técnicas:** Los usuarios de auth se crean via `supabase.auth.admin.createUser` o en el seed con insert directo a `auth.users` (solo en desarrollo).

---

## V01-AUTH-001 — Crear clientes Supabase (browser, server, service role) (hecho)

- Tipo: feature
- Módulo: auth
- Prioridad: critical
- Estimación: 2
- Versión: v0.1
- Estado: done
- Dependencias: V01-INFRA-002, V01-INFRA-003

**Descripción:** Implementar los 3 clientes Supabase: browser para Client Components, server para Server Components/API Routes, y service role para operaciones administrativas.

**Criterios de aceptación:**
- [x] `src/lib/supabase/client.ts` exporta `createBrowserClient()`
- [x] `src/lib/supabase/server.ts` exporta `createServerClient()` y `createServiceRoleClient()`
- [x] Los clientes usan las variables de entorno correctas
- [x] El server client maneja cookies correctamente para SSR

**Notas técnicas:** Código de referencia en `autenticacion.md`.

---

## V01-AUTH-002 — Implementar middleware de sesión (hecho)

- Tipo: feature
- Módulo: auth
- Prioridad: critical
- Estimación: 3
- Versión: v0.1
- Estado: done
- Dependencias: V01-AUTH-001

**Descripción:** Crear `src/middleware.ts` que intercepta todas las requests, refresca sesiones, y redirige según autenticación.

**Criterios de aceptación:**
- [x] Rutas públicas (`/login`, `/register`, `/api/auth/callback`) accesibles sin sesión
- [x] Rutas protegidas (`/`, `/productos`, etc.) redirigen a `/login` si no hay sesión
- [x] Si hay sesión y el usuario va a `/login`, redirige al dashboard
- [x] La sesión se refresca automáticamente si está por expirar
- [x] El matcher excluye assets estáticos (`_next/static`, imágenes, etc.)

**Notas técnicas:** Código completo en `autenticacion.md`.

---

## V01-AUTH-003 — Página de registro (nuevo tenant + usuario admin) (hecho)

- Tipo: feature
- Módulo: auth
- Prioridad: critical
- Estimación: 5
- Versión: v0.1
- Estado: done
- Dependencias: V01-AUTH-002, V01-DB-005

**Descripción:** Crear la página de registro y la API route que crea un tenant, modulo_config y usuario admin en una transacción. Incluye cleanup si algún paso falla.

**Criterios de aceptación:**
- [x] Página `/register` con formulario: nombre del negocio, nombre, apellido, email, contraseña
- [x] API route `POST /api/auth/register` crea auth user → tenant → modulo_config → usuario
- [x] Si falla algún paso, revierte los anteriores (cleanup)
- [x] Después del registro, hace login automático y redirige al dashboard
- [x] Validación de campos: email válido, contraseña mínimo 6 caracteres, nombre requerido
- [x] Errores mostrados al usuario (email ya registrado, etc.)

**Notas técnicas:** Código de referencia en `autenticacion.md`.

---

## V01-AUTH-004 — Página de login (email/password) (hecho)

- Tipo: feature
- Módulo: auth
- Prioridad: critical
- Estimación: 3
- Versión: v0.1
- Estado: done
- Dependencias: V01-AUTH-002

**Descripción:** Crear la página de login con email y contraseña. El `custom_access_token_hook` inyecta el `tenant_id` en el JWT automáticamente.

**Criterios de aceptación:**
- [x] Página `/login` con formulario: email, contraseña
- [x] Usa `supabase.auth.signInWithPassword()`
- [x] Redirige al dashboard después del login exitoso
- [x] Muestra errores de credenciales inválidas
- [x] Link a `/register` para nuevos usuarios
- [x] Layout de auth sin sidebar (limpio)

**Notas técnicas:** El hook de JWT debe estar registrado en Supabase Dashboard (ver V01-DB-003).

---

## V01-AUTH-005 — Callback de auth y logout (hecho)

- Tipo: feature
- Módulo: auth
- Prioridad: high
- Estimación: 2
- Versión: v0.1
- Estado: done
- Dependencias: V01-AUTH-002

**Descripción:** Crear el endpoint de callback para magic links y la funcionalidad de logout.

**Criterios de aceptación:**
- [x] `GET /api/auth/callback` intercambia code por sesión y redirige
- [x] Botón de logout en el header del dashboard
- [x] Logout limpia la sesión y redirige a `/login`
- [x] Magic link funciona end-to-end (si se configura email en Supabase)

**Notas técnicas:** Código en `autenticacion.md`.

---

## V01-AUTH-006 — Registrar custom_access_token_hook en Supabase (hecho)

- Tipo: setup
- Módulo: auth
- Prioridad: critical
- Estimación: 1
- Versión: v0.1
- Estado: done
- Dependencias: V01-DB-003

**Descripción:** Paso manual: registrar la función `custom_access_token_hook` en el Supabase Dashboard para que inyecte `tenant_id` en el JWT.

**Criterios de aceptación:**
- [ ] Hook registrado en Authentication → Hooks → Customize Access Token
- [ ] Verificar: al hacer login, el JWT contiene el claim `tenant_id`
- [ ] Verificar: un usuario sin registro en tabla `usuario` genera JWT sin `tenant_id` (y no ve datos)

**Notas técnicas:** Instrucciones detalladas en `multi-tenancy.md` y `deploy.md`.

---

## V01-UI-001 — Layout del dashboard con sidebar y header (hecho)

- Tipo: feature
- Módulo: ui
- Prioridad: high
- Estimación: 5
- Versión: v0.1
- Estado: done
- Dependencias: V01-INFRA-002, V01-AUTH-002

**Descripción:** Crear el layout principal del dashboard: sidebar con navegación, header con nombre del tenant y botón de logout, área de contenido. La sidebar es estática por ahora (todos los items visibles).

**Criterios de aceptación:**
- [x] `(dashboard)/layout.tsx` con sidebar izquierda + header superior + contenido
- [x] Sidebar con items: Dashboard, Productos, Movimientos, Importar, Proveedores, Configuración
- [x] Header muestra nombre del usuario y botón de logout
- [x] Item activo resaltado según la ruta actual
- [x] Responsive: sidebar colapsable en móvil
- [x] `(auth)/layout.tsx` limpio, centrado, sin sidebar

**Notas técnicas:** Usar componentes de `modulos.md` como referencia para la sidebar.

---

## V01-UI-002 — Página de dashboard vacío (hecho)

- Tipo: feature
- Módulo: ui
- Prioridad: medium
- Estimación: 2
- Versión: v0.1
- Estado: done
- Dependencias: V01-UI-001

**Descripción:** Crear la página principal del dashboard con un mensaje de bienvenida y placeholders para las cards de métricas que se implementarán en v2.0.

**Criterios de aceptación:**
- [x] `(dashboard)/page.tsx` muestra "Bienvenido a SmartStock" con el nombre del tenant
- [x] Placeholder para cards de métricas (stock bajo, vencimientos, ventas del día)
- [x] El usuario logueado ve esta página al entrar a `/`

**Notas técnicas:** Las cards de métricas reales se implementan en V20-UI-001.

---

## V01-TEST-001 — Test de aislamiento RLS entre tenants (hecho)

- Tipo: test
- Módulo: auth
- Prioridad: critical
- Estimación: 5
- Versión: v0.1
- Estado: done
- Dependencias: V01-DB-005, V01-AUTH-006

**Descripción:** Escribir tests automatizados que verifican que un tenant no puede ver, crear, editar ni eliminar datos de otro tenant.

**Criterios de aceptación:**
- [x] Test: Tenant A puede SELECT sus productos, Tenant B no los ve
- [x] Test: Tenant B no puede UPDATE productos de Tenant A
- [x] Test: Tenant B no puede DELETE productos de Tenant A
- [x] Test: Tenant B no puede INSERT con `tenant_id` de Tenant A
- [x] Test: usuario sin `tenant_id` en JWT no ve ningún dato
- [x] Tests pasan con `npm test` o `npx vitest`

**Notas técnicas:** Suite completa en `multi-tenancy.md`. Usar Vitest con el Supabase client.

---

## V01-INFRA-004 — Configurar Vitest y estructura de tests (hecho)

- Tipo: setup
- Módulo: infra
- Prioridad: high
- Estimación: 2
- Versión: v0.1
- Estado: done
- Dependencias: V01-INFRA-002

**Descripción:** Configurar Vitest como framework de testing, con soporte para TypeScript y variables de entorno.

**Criterios de aceptación:**
- [x] `vitest` y `@testing-library/react` instalados
- [x] `vitest.config.ts` configurado con paths alias y setup file
- [x] Script `test` en `package.json` ejecuta Vitest
- [x] Un test trivial pasa para verificar la configuración

**Notas técnicas:** Configurar `dotenv` para leer `.env.local` en los tests.

---

## V01-TYPES-001 — Generar tipos TypeScript de Supabase (hecho)

- Tipo: setup
- Módulo: infra
- Prioridad: high
- Estimación: 1
- Versión: v0.1
- Estado: done
- Dependencias: V01-DB-004

**Descripción:** Generar los tipos TypeScript automáticos desde el schema de Supabase para tener type safety en todo el proyecto.

**Criterios de aceptación:**
- [x] `src/types/database.ts` generado con `supabase gen types typescript`
- [x] Script `gen:types` en `package.json` para regenerar
- [x] Los clientes Supabase tipados con `Database` genérico
- [x] Autocompletado funciona en queries `.from('producto').select(...)`

**Notas técnicas:** `npm run gen:types` (requiere `SUPABASE_ACCESS_TOKEN`; el ref se toma de `.env.local`). El archivo versionado refleja el esquema documentado en `base-de-datos.md` hasta regenerar contra el proyecto remoto.

---

## V10-STOCK-001 — CRUD de categorías (hecho)

- Tipo: feature
- Módulo: stock
- Prioridad: high
- Estimación: 3
- Versión: v1.0
- Estado: done
- Dependencias: V01-UI-001, V01-AUTH-001

**Descripción:** Implementar el CRUD completo de categorías: listado, creación, edición y soft-delete.

**Criterios de aceptación:**
- [x] API route `GET /api/categorias` retorna categorías del tenant
- [x] API route `POST /api/categorias` crea una categoría
- [x] Validación: nombre único dentro del tenant (constraint de DB)
- [x] Guard de rol: visor no puede crear/editar
- [x] UI: listado con opción de crear nueva desde un modal/dialog

**Notas técnicas:** Código de referencia en `stock.md`.

---

## V10-STOCK-002 — CRUD de proveedores (hecho)

- Tipo: feature
- Módulo: stock
- Prioridad: high
- Estimación: 3
- Versión: v1.0
- Estado: done
- Dependencias: V01-UI-001, V01-AUTH-001

**Descripción:** Implementar el CRUD completo de proveedores: listado, creación, edición, detalle con perfil de mapeo Excel.

**Criterios de aceptación:**
- [x] Páginas `/proveedores` (lista) y `/proveedores/[id]` (detalle)
- [x] API routes GET, POST, PATCH para proveedores
- [x] Campos: nombre, CUIT, teléfono, email, dirección, notas
- [x] El detalle muestra el perfil de mapeo Excel guardado (si existe)
- [x] Guard de rol: visor no puede crear/editar

**Notas técnicas:** El campo `mapeo_excel` se llena desde el importador (V10-IMP-004).

---

## V10-STOCK-003 — CRUD de productos con búsqueda y filtros (hecho)

- Tipo: feature
- Módulo: stock
- Prioridad: critical
- Estimación: 8
- Versión: v1.0
- Estado: done
- Dependencias: V10-STOCK-001, V10-STOCK-002

**Descripción:** Implementar el CRUD completo de productos con búsqueda full-text en español, filtros por categoría/proveedor, y paginación.

**Criterios de aceptación:**
- [x] Página `/productos` con tabla de productos: código, nombre, categoría, stock, costo, venta, margen
- [x] Búsqueda full-text con `textSearch('nombre', ...)` en español
- [x] Filtros por categoría y proveedor (dropdowns)
- [x] Paginación server-side
- [x] Página `/productos/nuevo` con formulario de creación
- [x] Página `/productos/[id]` con detalle, edición y historial de movimientos
- [x] Stock inicial opcional al crear (genera movimiento de entrada)
- [x] Soft-delete (`activo = false`)
- [x] Guard de rol: visor solo ve, no edita

**Notas técnicas:** Código de referencia en `stock.md`. Índice full-text `idx_producto_nombre` ya existe.

---

## V10-STOCK-004 — Registro de movimientos de stock (hecho)

- Tipo: feature
- Módulo: stock
- Prioridad: critical
- Estimación: 5
- Versión: v1.0
- Estado: done
- Dependencias: V10-STOCK-003

**Descripción:** Implementar el registro de movimientos (entrada, salida, ajuste) usando la función atómica `registrar_movimiento`, con página de historial.

**Criterios de aceptación:**
- [x] API route `POST /api/movimientos` llama a `registrar_movimiento` via RPC
- [x] API route `GET /api/movimientos` con filtros por producto y tipo
- [x] Página `/movimientos` con historial paginado
- [x] Componente de movimiento rápido en el detalle del producto
- [x] Validación: salida no puede dejar stock negativo (error de la función SQL)
- [x] Ajuste establece el valor absoluto
- [x] Cada movimiento graba `stock_anterior` y `stock_posterior`

**Notas técnicas:** Código en `stock.md`. La función SQL maneja atomicidad y `FOR UPDATE`.

---

## V10-STOCK-005 — Alertas de stock mínimo en el dashboard (hecho)

- Tipo: feature
- Módulo: stock
- Prioridad: high
- Estimación: 3
- Versión: v1.0
- Estado: done
- Dependencias: V10-STOCK-003

**Descripción:** Mostrar una card en el dashboard con productos que tienen stock por debajo del mínimo configurado.

**Criterios de aceptación:**
- [x] API route `GET /api/alertas/stock-bajo` retorna productos donde `stock_actual <= stock_minimo`
- [x] Card en el dashboard con badge de cantidad y lista de los primeros 5
- [x] Link "Ver todos" que filtra la tabla de productos
- [x] La card no se muestra si no hay productos con stock bajo

**Notas técnicas:** Componente `StockBajoCard` en `stock.md`.

---

## V10-STOCK-006 — Alertas de vencimiento de productos (hecho)

- Tipo: feature
- Módulo: stock
- Prioridad: high
- Estimación: 3
- Versión: v1.0
- Estado: done
- Dependencias: V10-STOCK-003

**Descripción:** Mostrar una card en el dashboard con productos que vencen en los próximos 30 días, con estados: vencido, crítico (7 días), próximo (30 días).

**Criterios de aceptación:**
- [x] API route `GET /api/alertas/vencimientos` con clasificación por estado
- [x] Card con badges por severidad (rojo=vencido, naranja=7 días, amarillo=30 días)
- [x] Muestra días restantes o "Venció hace X días"
- [x] La card no se muestra si no hay productos con vencimiento próximo

**Notas técnicas:** Componente `VencimientosCard` en `stock.md`.

---

## V10-STOCK-007 — Utilidades de formateo (moneda, fecha) (hecho)

- Tipo: feature
- Módulo: ui
- Prioridad: high
- Estimación: 1
- Versión: v1.0
- Estado: done
- Dependencias: V01-INFRA-001

**Descripción:** Crear funciones utilitarias de formateo para moneda argentina y fechas con locale `es-AR`.

**Criterios de aceptación:**
- [x] `formatCurrency(amount)` → `$1.234,56` formato ARS
- [x] `formatDate(date)` → `13/04/2026`
- [x] `formatDateTime(date)` → `13/04/2026, 14:30`
- [x] Ubicadas en `src/lib/utils/formatters.ts`

**Notas técnicas:** Usar `Intl.NumberFormat` y `Intl.DateTimeFormat`.

---

## V10-IMP-001 — Parseo de archivos Excel/CSV con SheetJS (hecho)

- Tipo: feature
- Módulo: importador
- Prioridad: critical
- Estimación: 3
- Versión: v1.0
- Estado: done
- Dependencias: V01-INFRA-002

**Descripción:** Implementar el parseo de archivos .xlsx/.xls/.csv en el browser usando SheetJS. Instalar la librería y crear la función de parseo.

**Criterios de aceptación:**
- [x] `xlsx` (SheetJS) instalado como dependencia
- [x] Función `parsearArchivo(file)` retorna headers + filas como objetos JSON
- [x] Soporta `.xlsx`, `.xls`, `.csv`
- [x] Maneja archivos vacíos con error descriptivo
- [x] Procesamiento 100% en el browser (no sube al servidor)

**Notas técnicas:** Código en `importador.md`.

---

## V10-IMP-002 — Normalizador de headers (diccionario de aliases) (hecho)

- Tipo: feature
- Módulo: importador
- Prioridad: critical
- Estimación: 3
- Versión: v1.0
- Estado: done
- Dependencias: V10-IMP-001

**Descripción:** Implementar el diccionario de aliases y la función de mapeo automático que detecta a qué campo del sistema corresponde cada columna del Excel.

**Criterios de aceptación:**
- [x] Diccionario con 10 campos y 60+ aliases en `src/lib/normalizador/aliases.ts`
- [x] Función `normalizarString` que normaliza a minúsculas sin tildes ni caracteres especiales
- [x] Función `mapearHeaders(headers)` retorna el mapeo con confianza (exacta, parcial, ninguna)
- [x] Función `aplicarPerfilProveedor` aplica un mapeo guardado previamente
- [x] "Precio Unit." matchea con `precio_venta`, "COD ART" con `codigo`, etc.

**Notas técnicas:** Código completo en `importador.md`.

---

## V10-IMP-003 — Pantalla de mapeo interactivo de columnas (hecho)

- Tipo: feature
- Módulo: importador
- Prioridad: critical
- Estimación: 5
- Versión: v1.0
- Estado: done
- Dependencias: V10-IMP-002

**Descripción:** Crear la UI de mapeo donde el usuario ve las columnas del archivo y puede confirmar o corregir la asignación a campos del sistema.

**Criterios de aceptación:**
- [x] Página `/importar/mapeo` muestra columnas del Excel ↔ campos del sistema
- [x] Iconos de confianza: check verde (exacta), warning amarillo (parcial), X roja (sin match)
- [x] Dropdown para cambiar la asignación de cada columna
- [x] Opción de "Ignorar columna"
- [x] Muestra ejemplo de la primera fila por cada columna
- [x] Validación: campo "Nombre" obligatorio
- [x] Botón "Continuar al preview" habilitado solo si hay al menos nombre mapeado

**Notas técnicas:** Componente `MapeoColumnas` en `importador.md`.

---

## V10-IMP-004 — Guardar perfil de mapeo en proveedor (hecho)

- Tipo: feature
- Módulo: importador
- Prioridad: high
- Estimación: 2
- Versión: v1.0
- Estado: done
- Dependencias: V10-IMP-003, V10-STOCK-002

**Descripción:** Permitir al usuario guardar el mapeo configurado como perfil del proveedor para reutilizar en futuras importaciones.

**Criterios de aceptación:**
- [x] Selector de proveedor en el paso de upload
- [x] Si el proveedor tiene perfil guardado, se aplica automáticamente
- [x] Checkbox "Guardar este mapeo para futuras importaciones"
- [x] Se guarda en `proveedor.mapeo_excel` como JSONB
- [x] En la próxima importación con ese proveedor, se salta el paso de mapeo

**Notas técnicas:** Función `guardarPerfilMapeo` en `importador.md`.

---

## V10-IMP-005 — Validación de datos y preview interactivo (hecho)

- Tipo: feature
- Módulo: importador
- Prioridad: critical
- Estimación: 5
- Versión: v1.0
- Estado: done
- Dependencias: V10-IMP-003

**Descripción:** Implementar la validación fila por fila y el preview editable donde el usuario puede corregir errores antes de confirmar.

**Criterios de aceptación:**
- [x] Función `validarFilas()` valida: nombre no vacío, precios numéricos positivos, stock enteros, fechas reconocibles
- [x] Parseo de precios argentinos: `$1.234,56` → `1234.56`
- [x] Parseo de fechas: `DD/MM/YYYY`, `DD-MM-YYYY`, `YYYY-MM-DD`
- [x] Preview con tabla editable: filas con error marcadas en rojo
- [x] Edición inline de celdas con error
- [x] Botón para descartar filas individuales
- [x] Contador: X válidas, Y con errores

**Notas técnicas:** Funciones `validarFilas` y componente `PreviewTable` en `importador.md`.

---

## V10-IMP-006 — API de ejecución de importación (upsert) (hecho)

- Tipo: feature
- Módulo: importador
- Prioridad: critical
- Estimación: 8
- Versión: v1.0
- Estado: done
- Dependencias: V10-IMP-005, V10-STOCK-004

**Descripción:** Implementar la API route que recibe las filas validadas y ejecuta el upsert: busca por código, actualiza o crea, registra movimientos y precio_historial, y guarda el log.

**Criterios de aceptación:**
- [x] API route `POST /api/importar/ejecutar` procesa array de filas
- [x] Upsert por `(tenant_id, codigo)`: si existe → UPDATE, si no → INSERT
- [x] Categorías se crean automáticamente si no existen (por nombre)
- [x] Si cambió precio, se registra en `precio_historial`
- [x] Si cambió stock, se registra movimiento de ajuste
- [x] Si producto nuevo tiene stock > 0, se registra movimiento de entrada
- [x] Se crea registro en `importacion_log` con métricas completas
- [x] Response: `{ productos_creados, productos_actualizados, filas_con_error, detalle_errores }`

**Notas técnicas:** Código completo de la API en `importador.md`.

---

## V10-IMP-007 — Componente de upload con drag & drop (hecho)

- Tipo: feature
- Módulo: importador
- Prioridad: high
- Estimación: 3
- Versión: v1.0
- Estado: done
- Dependencias: V10-IMP-001

**Descripción:** Crear el componente de upload de archivo con drag & drop y selección por click, con validación de extensión y tamaño.

**Criterios de aceptación:**
- [x] Zona de drop visual con icono y texto instructivo
- [x] Acepta drag & drop y click para seleccionar
- [x] Valida extensión (.xlsx, .xls, .csv) y tamaño (máx 10 MB)
- [x] Muestra loading mientras parsea
- [x] Muestra error si el archivo no es válido
- [x] Página `/importar` con este componente como primer paso del wizard

**Notas técnicas:** Componente `UploadArchivo` en `importador.md`.

---

## V10-IMP-008 — Resumen de importación y deduplicación (hecho)

- Tipo: feature
- Módulo: importador
- Prioridad: high
- Estimación: 3
- Versión: v1.0
- Estado: done
- Dependencias: V10-IMP-006

**Descripción:** Implementar la pantalla de resumen post-importación y la lógica de deduplicación de filas dentro del mismo archivo.

**Criterios de aceptación:**
- [x] Pantalla de resumen con 4 métricas: total, creados, actualizados, errores
- [x] Detalle de errores expandible
- [x] Links: "Ver productos" y "Importar otro archivo"
- [x] Deduplicación: si dos filas tienen el mismo código, se toma la última
- [x] Indicador de filas duplicadas descartadas

**Notas técnicas:** Componentes `ResumenImportacion` y función `deduplicarFilas` en `importador.md`.

---

## V10-IMP-009 — Plantilla Excel descargable (hecho)

- Tipo: feature
- Módulo: importador
- Prioridad: medium
- Estimación: 1
- Versión: v1.0
- Estado: done
- Dependencias: V01-INFRA-001

**Descripción:** Crear una plantilla Excel en `public/plantillas/` con las columnas predefinidas y un ejemplo, con link de descarga en la página de importación.

**Criterios de aceptación:**
- [x] Archivo `public/plantillas/plantilla_importacion.xlsx` con headers y 1 fila de ejemplo
- [x] Link "Descargar plantilla" visible en la página `/importar`
- [x] Columnas: Código, Nombre, Precio Costo, Precio Venta, Stock, Stock Mínimo, Categoría, Unidad, Vencimiento

**Notas técnicas:** Generar con SheetJS o crear manualmente.

---

# BLOQUE B — v1.5 (Facturador simple) y v2.0 (Lanzamiento)

---

## V15-FAC-001 — CRUD de clientes (hecho)

- Tipo: feature
- Módulo: facturacion
- Prioridad: critical
- Estimación: 5
- Versión: v1.5
- Estado: done ✅
- Dependencias: V01-UI-001, V01-AUTH-001

**Descripción:** Implementar el CRUD completo de clientes con datos fiscales (CUIT/DNI, condición IVA) necesarios para emitir comprobantes.

**Criterios de aceptación:**
- [x] Páginas `/clientes` (lista) y `/clientes/[id]` (detalle/edición)
- [x] API routes GET, POST, PATCH para clientes
- [x] Campos: nombre, razón social, CUIT/DNI, condición IVA, dirección, teléfono, email, notas
- [x] Búsqueda por nombre o CUIT
- [x] Soft-delete (activo = false)
- [x] Guard de módulo: requiere `facturador_simple`
- [x] Guard de rol: visor no puede crear/editar

**Notas técnicas:** La condición IVA del cliente determina qué tipo de factura se emite (A, B o C).

---

## V15-FAC-002 — Determinación automática del tipo de factura (hecho)

- Tipo: feature
- Módulo: facturacion
- Prioridad: critical
- Estimación: 2
- Versión: v1.5
- Estado: done ✅
- Dependencias: V15-FAC-001

**Descripción:** Implementar la lógica que determina automáticamente si corresponde Factura A, B o C según la condición IVA del emisor (tenant) y del receptor (cliente).

**Criterios de aceptación:**
- [x] Función `determinarTipoFactura(emisor, receptor)` retorna `factura_a`, `factura_b` o `factura_c`
- [x] RI → RI = Factura A
- [x] RI → CF/Mono/Exento = Factura B
- [x] Mono/Exento → cualquiera = Factura C
- [x] Al seleccionar cliente en el formulario de emisión, el tipo se pre-selecciona automáticamente

**Notas técnicas:** Código en `facturacion.md`.

---

## V15-FAC-003 — Cálculo de importes (subtotal, IVA, total) (hecho)

- Tipo: feature
- Módulo: facturacion
- Prioridad: critical
- Estimación: 2
- Versión: v1.5
- Estado: done ✅
- Dependencias: V15-FAC-002

**Descripción:** Implementar el cálculo de importes según el tipo de comprobante: IVA discriminado para Factura A, IVA incluido para B/C.

**Criterios de aceptación:**
- [x] Función `calcularImportes(items, tipo, ivaPorcentaje)` retorna subtotal, iva_monto, total
- [x] Factura A: subtotal neto + IVA discriminado (21%) = total
- [x] Factura B/C: total = subtotal (IVA incluido en precio)
- [x] Redondeo a 2 decimales en todos los cálculos
- [x] Items: cantidad × precio_unitario = subtotal por item

**Notas técnicas:** Código en `facturacion.md`.

---

## V15-FAC-004 — Generación de PDF con jsPDF (hecho)

- Tipo: feature
- Módulo: facturacion
- Prioridad: critical
- Estimación: 8
- Versión: v1.5
- Estado: done ✅
- Dependencias: V15-FAC-003

**Descripción:** Implementar el generador de PDF de comprobantes usando jsPDF con el layout definido: header con letra, datos emisor/receptor, tabla de items, totales, leyendas.

**Criterios de aceptación:**
- [x] `jspdf` instalado como dependencia
- [x] Función `generarPDF(emisor, cliente, comprobante, items)` retorna un `jsPDF`
- [x] Header: letra del comprobante (A/B/C), tipo y número con formato `PPPP-NNNNNNNN`
- [x] Datos del emisor: razón social, CUIT, domicilio, condición IVA
- [x] Datos del cliente: nombre, CUIT/DNI, condición IVA
- [x] Tabla de items con cant, descripción, precio unitario, subtotal
- [x] Totales: subtotal, IVA (si aplica), total
- [x] Paginación si los items superan una página
- [x] PDF generado es legible y profesional

**Notas técnicas:** Código completo en `facturacion.md`. El PDF se genera en el servidor (API route).

---

## V15-FAC-005 — Numeración secuencial atómica de comprobantes (hecho)

- Tipo: feature
- Módulo: facturacion
- Prioridad: critical
- Estimación: 2
- Versión: v1.5
- Estado: done ✅
- Dependencias: V01-DB-004

**Descripción:** Implementar el wrapper TypeScript para la función SQL `siguiente_numero_comprobante` y el formateo `PPPP-NNNNNNNN`.

**Criterios de aceptación:**
- [x] Función `obtenerSiguienteNumero(supabase, tenantId, tipo)` llama al RPC
- [x] Función `formatearNumeroComprobante(puntoDeVenta, numero)` → `"0001-00000045"`
- [x] Función `formatearTipoComprobante(tipo)` → `"Factura A"`, `"Remito"`, etc.
- [x] La numeración es secuencial por tenant y tipo (factura_a, factura_b, etc. tienen secuencias separadas)
- [x] El índice UNIQUE previene duplicados bajo concurrencia

**Notas técnicas:** Código en `facturacion.md`.

---

## V15-FAC-006 — API de emisión de comprobante (hecho)

- Tipo: feature
- Módulo: facturacion
- Prioridad: critical
- Estimación: 8
- Versión: v1.5
- Estado: done ✅
- Dependencias: V15-FAC-004, V15-FAC-005, V10-STOCK-004

**Descripción:** Implementar la API route completa de emisión que: verifica stock, calcula importes, obtiene número, crea comprobante + items, registra movimientos de salida, genera PDF, sube a Storage.

**Criterios de aceptación:**
- [x] API route `POST /api/facturacion/emitir` con los 12 pasos del flujo
- [x] Guard de módulo `facturador_simple`
- [x] Guard de rol (visor no puede emitir)
- [x] Verificación de stock antes de emitir (excepto presupuestos)
- [x] Descuento de stock por cada item (movimiento de salida con referencia `factura`)
- [x] Notas de crédito generan movimientos de entrada (devuelven stock)
- [x] Presupuestos no afectan stock
- [x] PDF subido a Supabase Storage en `{tenant_id}/comprobantes/`
- [x] URL del PDF guardada en `comprobante.pdf_url`
- [x] Response incluye datos del comprobante y URL del PDF

**Notas técnicas:** Código completo en `facturacion.md`. Bucket `comprobantes` debe existir en Storage.

---

## V15-FAC-007 — Crear bucket de Storage para comprobantes (hecho)

- Tipo: setup
- Módulo: facturacion
- Prioridad: critical
- Estimación: 1
- Versión: v1.5
- Estado: done ✅
- Dependencias: V01-INFRA-003

**Descripción:** Crear el bucket `comprobantes` en Supabase Storage con policies RLS para que cada tenant solo acceda a sus propios PDFs.

**Criterios de aceptación:**
- [x] Bucket `comprobantes` creado en Supabase Storage
- [x] Policy SELECT: solo puede leer archivos en su carpeta `{tenant_id}/`
- [x] Policy INSERT: solo puede subir archivos en su carpeta `{tenant_id}/`
- [x] Archivos no son públicos (se accede via URL firmada o policy)

**Notas técnicas:** Policies de Storage en `deploy.md`.

---

## V15-FAC-008 — UI formulario de emisión de comprobante (hecho)

- Tipo: feature
- Módulo: facturacion
- Prioridad: critical
- Estimación: 8
- Versión: v1.5
- Estado: done ✅
- Dependencias: V15-FAC-006, V15-FAC-001, V10-STOCK-003

**Descripción:** Crear la página `/facturacion/nueva` con el formulario interactivo: selección de tipo y cliente, agregar productos, ver totales en tiempo real, emitir.

**Criterios de aceptación:**
- [x] Selector de tipo de comprobante (Factura A/B/C, Remito, Presupuesto)
- [x] Selector de cliente con auto-determinación del tipo de factura
- [x] Buscador de productos para agregar al comprobante
- [x] Tabla de items con cantidad y precio editables
- [x] Cálculo en tiempo real de subtotal, IVA y total
- [x] Campo de notas opcional
- [x] Botón "Emitir" que llama a la API y muestra resultado
- [x] Después de emitir, redirige al detalle del comprobante

**Notas técnicas:** Componente `EmitirComprobante` en `facturacion.md`.

---

## V15-FAC-009 — Listado de comprobantes con filtros (hecho)

- Tipo: feature
- Módulo: facturacion
- Prioridad: high
- Estimación: 3
- Versión: v1.5
- Estado: done ✅
- Dependencias: V15-FAC-006

**Descripción:** Crear la página `/facturacion` con el listado de comprobantes emitidos, filtrable por tipo, estado y cliente.

**Criterios de aceptación:**
- [x] API route `GET /api/facturacion` con filtros y paginación
- [x] Tabla con: tipo+número, fecha, cliente, total, estado (badge de color)
- [x] Filtros por tipo de comprobante, estado y cliente
- [x] Ordenado por fecha descendente
- [x] Click en un comprobante lleva al detalle

**Notas técnicas:** Código en `facturacion.md`.

---

## V15-FAC-010 — Detalle de comprobante con descarga/impresión (hecho)

- Tipo: feature
- Módulo: facturacion
- Prioridad: high
- Estimación: 3
- Versión: v1.5
- Estado: done ✅
- Dependencias: V15-FAC-009

**Descripción:** Crear la página `/facturacion/[id]` con detalle completo del comprobante: datos, items, totales, estado, y botones de descarga/impresión del PDF.

**Criterios de aceptación:**
- [x] Muestra tipo + número formateado, fecha, cliente, items, totales
- [x] Badge de estado con color según valor
- [x] Botón "Descargar PDF" (link directo al archivo en Storage)
- [x] Botón "Imprimir" (abre PDF en nueva ventana)
- [x] Si tiene CAE (futuro), lo muestra en un banner verde

**Notas técnicas:** Componente `ComprobanteDetalle` en `facturacion.md`.

---

## V15-FAC-011 — Configuración del negocio (datos fiscales del tenant) (hecho)

- Tipo: feature
- Módulo: facturacion
- Prioridad: high
- Estimación: 3
- Versión: v1.5
- Estado: done ✅
- Dependencias: V01-UI-001

**Descripción:** Crear la página `/configuracion` donde el admin puede editar los datos fiscales del negocio: razón social, CUIT, domicilio, condición IVA, punto de venta, logo.

**Criterios de aceptación:**
- [x] Página `/configuracion` con formulario de datos del tenant
- [x] Campos: nombre, razón social, CUIT, domicilio, teléfono, email, condición IVA, punto de venta
- [ ] Upload de logo (sube a Supabase Storage) — pendiente, se implementará cuando se necesite
- [x] Solo admin puede editar
- [x] Los datos del tenant se usan en la generación de PDF

**Notas técnicas:** Actualiza la tabla `tenant`.

---

## V20-UI-001 — Dashboard con métricas y alertas (hecho)

- Tipo: feature
- Módulo: ui
- Prioridad: high
- Estimación: 5
- Versión: v2.0
- Estado: done
- Dependencias: V10-STOCK-005, V10-STOCK-006, V15-FAC-006

**Descripción:** Transformar el dashboard vacío en una página con cards de métricas: total de productos, valor del inventario, comprobantes del mes, y las alertas de stock bajo/vencimientos.

**Criterios de aceptación:**
- [x] Card: Total de productos activos
- [x] Card: Valor total del inventario (suma de stock_actual × precio_costo)
- [x] Card: Comprobantes emitidos este mes
- [x] Card: Ventas del mes (suma de totales de comprobantes)
- [x] Card de alerta: Stock bajo (ya implementada en V10-STOCK-005)
- [x] Card de alerta: Vencimientos (ya implementada en V10-STOCK-006)
- [x] Layout responsive: 2 columnas en desktop, 1 en móvil

**Notas técnicas:** Las métricas se obtienen con queries agregados via API routes.

---

## V20-UI-002 — Sistema de feature flags dinámico (sidebar + guards) (hecho)

- Tipo: feature
- Módulo: ui
- Prioridad: critical
- Estimación: 5
- Versión: v2.0
- Estado: done
- Dependencias: V01-UI-001

**Descripción:** Implementar el sistema de módulos dinámicos: sidebar que muestra/oculta items según `modulo_config`, guards en API routes y pages, hook `useModulos`.

**Criterios de aceptación:**
- [x] Hook `useModulos()` consulta `modulo_config` y expone flags booleanos
- [x] Sidebar dinámica: solo muestra items de módulos activos
- [x] `moduloGuard(modulo)` para API routes: retorna 403 si el módulo no está activo
- [x] `requireModulo(modulo)` para Server Components: redirige a `/` si no está activo
- [x] Acceder por URL a `/pedidos` sin el módulo activo redirige al dashboard

**Notas técnicas:** Código completo en `modulos.md`.

---

## V20-UI-003 — API y UI de cambio de plan (hecho)

- Tipo: feature
- Módulo: ui
- Prioridad: high
- Estimación: 3
- Versión: v2.0
- Estado: done
- Dependencias: V20-UI-002

**Descripción:** Implementar la página `/configuracion/plan` donde el admin puede ver su plan actual y upgradear/downgradear, con la función SQL `activar_plan`.

**Criterios de aceptación:**
- [x] Página `/configuracion/plan` muestra plan actual y módulos activos
- [x] Comparativa visual Plan Base vs Plan Completo
- [x] Botón "Cambiar a Plan Completo" / "Cambiar a Plan Base"
- [x] API route `POST /api/configuracion/plan` llama a `activar_plan` RPC
- [x] Solo admin puede cambiar el plan
- [x] Al cambiar plan, la sidebar se actualiza inmediatamente

**Notas técnicas:** Función SQL `activar_plan` en `modulos.md`. Migración `014_activar_plan.sql` en el repo.

---

## V20-UI-004 — Onboarding de primer uso (hecho)

- Tipo: feature
- Módulo: ui
- Prioridad: medium
- Estimación: 5
- Versión: v2.0
- Estado: done
- Dependencias: V15-FAC-011

**Descripción:** Crear un wizard de onboarding que guía al nuevo usuario en los primeros pasos: completar datos del negocio, crear la primera categoría, crear el primer producto.

**Criterios de aceptación:**
- [x] Detectar si es la primera vez (no hay productos ni datos fiscales completos)
- [x] Paso 1: Completar datos del negocio (razón social, CUIT, condición IVA)
- [x] Paso 2: Crear al menos una categoría
- [x] Paso 3: Crear el primer producto o importar un Excel
- [x] Opción de "Saltear" cada paso
- [x] No volver a mostrar si se completó o se salteó

**Notas técnicas:** Guardar estado del onboarding en localStorage o en un campo del tenant.

---

## V20-UI-005 — Responsive design completo (hecho)

- Tipo: feature
- Módulo: ui
- Prioridad: high
- Estimación: 5
- Versión: v2.0
- Estado: done
- Dependencias: V15-FAC-008, V10-STOCK-003

**Descripción:** Asegurar que toda la UI funciona correctamente en mobile y tablet: sidebar colapsable, tablas scrolleables, formularios adaptados.

**Criterios de aceptación:**
- [x] Sidebar se colapsa en un menú hamburguesa en pantallas < 768px
- [x] Tablas de productos, movimientos y comprobantes scroll horizontal en móvil
- [x] Formularios de emisión y creación usables en móvil
- [x] Dashboard cards apiladas en móvil
- [x] No hay overflow horizontal en ninguna página
- [x] Testeado en Chrome DevTools para iPhone SE, iPhone 14, iPad

**Notas técnicas:** Usar clases responsive de Tailwind (`sm:`, `md:`, `lg:`).

---

## V20-DEPLOY-001 — Deploy a producción en Vercel

- Tipo: setup
- Módulo: infra
- Prioridad: critical
- Estimación: 3
- Versión: v2.0
- Estado: todo
- Dependencias: V20-UI-005

**Descripción:** Configurar y ejecutar el primer deploy a producción en Vercel con todas las variables de entorno, dominio custom y SSL.

**Criterios de aceptación:**
- [ ] Proyecto importado en Vercel desde GitHub
- [ ] Variables de entorno configuradas (ver `deploy.md`)
- [ ] Build exitoso en Vercel
- [ ] Dominio custom configurado con SSL
- [ ] Login y registro funcionan en producción
- [ ] Datos aislados entre tenants verificado en producción

**Notas técnicas:** Checklist completa en `deploy.md`.

---

## V20-DEPLOY-002 — Checklist de go-live

- Tipo: docs
- Módulo: infra
- Prioridad: critical
- Estimación: 3
- Versión: v2.0
- Estado: todo
- Dependencias: V20-DEPLOY-001

**Descripción:** Verificar y completar toda la checklist de go-live antes de aceptar al primer cliente en producción.

**Criterios de aceptación:**
- [ ] RLS activo verificado en las 16 tablas
- [ ] Service role key no expuesta en cliente
- [ ] Rate limiting configurado en Supabase
- [ ] Email templates personalizados
- [ ] Bucket de Storage con policies
- [ ] Flujo completo testeado: registro → login → producto → Excel → factura
- [ ] Segundo tenant no ve datos del primero en producción
- [ ] Vercel Analytics habilitado

**Notas técnicas:** Checklist detallada en `deploy.md`.

---

## V20-TEST-001 — Tests de integración del flujo de facturación (hecho)

- Tipo: test
- Módulo: facturacion
- Prioridad: high
- Estimación: 5
- Versión: v2.0
- Estado: done
- Dependencias: V15-FAC-006

**Descripción:** Tests automatizados del flujo completo de facturación: crear cliente, crear productos, emitir factura, verificar stock descontado, verificar PDF generado.

**Criterios de aceptación:**
- [x] Test: emitir Factura C descuenta stock correctamente
- [x] Test: emitir Nota de Crédito devuelve stock
- [x] Test: presupuesto no afecta stock
- [x] Test: numeración secuencial sin huecos
- [x] Test: stock insuficiente rechaza la emisión
- [x] Tests pasan con `npm test`

**Notas técnicas:** Usar Vitest con el client de Supabase. Lógica de emisión en `src/lib/facturacion/emitir-comprobante.ts`; tests en `src/test/facturacion-integration.test.ts` (entorno `node`). PDF: smoke con `generarPDF` (buffer no vacío); emisión en tests sin subida a Storage.

---

## V20-TEST-002 — Tests del importador Excel (hecho)

- Tipo: test
- Módulo: importador
- Prioridad: high
- Estimación: 5
- Versión: v2.0
- Estado: done
- Dependencias: V10-IMP-006

**Descripción:** Tests del pipeline de importación: normalizador, validación, upsert, precio_historial, importacion_log.

**Criterios de aceptación:**
- [x] Test: normalizador detecta "COD ART" como `codigo`, "PVP" como `precio_venta`
- [x] Test: precios argentinos "$1.234,56" se parsean a 1234.56
- [x] Test: upsert crea producto si no existe, actualiza si existe
- [x] Test: precio_historial se registra cuando cambia un precio
- [x] Test: importacion_log tiene métricas correctas
- [x] Test: deduplicación toma la última fila con el mismo código

**Notas técnicas:** Crear archivos Excel de prueba con SheetJS en el test. Tests unitarios en `src/test/normalizador-import.test.ts`; integración y pipeline XLSX en `src/test/importacion-integration.test.ts`. Lógica de ejecución en `src/lib/importar/ejecutar-importacion.ts`.

---

## V20-UI-006 — Gestión de usuarios del tenant (hecho)

- Tipo: feature
- Módulo: auth
- Prioridad: medium
- Estimación: 5
- Versión: v2.0
- Estado: done
- Dependencias: V01-AUTH-003

**Descripción:** Permitir al admin del tenant invitar nuevos usuarios con roles (operador, visor) y gestionar usuarios existentes.

**Criterios de aceptación:**
- [x] Página `/configuracion/usuarios` lista usuarios del tenant
- [x] Formulario para invitar: email, nombre, apellido, rol
- [x] API crea auth user + registro en tabla `usuario` con el `tenant_id` del admin
- [x] Admin puede cambiar el rol de un usuario
- [x] Admin puede desactivar un usuario (activo = false)
- [x] Solo admin accede a esta página

**Notas técnicas:** Invitación vía `auth.admin.inviteUserByEmail` + insert en `usuario` (service role); alternativa documentada: `createUser`.

---

# BLOQUE C — v3.0 (Pedidos + IA de precios) y v4.0 (Integración ARCA)

---

## V30-PED-001 — CRUD de pedidos (crear, listar, detalle) (hecho)

- Tipo: feature
- Módulo: pedidos
- Prioridad: critical
- Estimación: 8
- Versión: v3.0
- Estado: done
- Dependencias: V20-UI-002, V10-STOCK-003, V15-FAC-001

**Descripción:** Implementar la creación, listado y detalle de pedidos. Un pedido se arma seleccionando cliente, agregando productos con cantidades y precios, y se guarda como borrador.

**Criterios de aceptación:**
- [x] API route `POST /api/pedidos` crea pedido con items en estado `borrador`
- [x] API route `GET /api/pedidos` con filtros por estado y cliente, paginado
- [x] Página `/pedidos` con tabla: #pedido, cliente, fecha, items, total, estado (badge)
- [x] Página `/pedidos/nuevo` con formulario: selector de cliente, buscador de productos, tabla de items
- [x] Página `/pedidos/[id]` con detalle completo y acciones según estado
- [x] Guard de módulo: requiere `pedidos`
- [x] Guard de rol: visor no puede crear

**Notas técnicas:** Código completo en `pedidos.md`.

---

## V30-PED-002 — Máquina de estados del pedido (hecho)

- Tipo: feature
- Módulo: pedidos
- Prioridad: critical
- Estimación: 5
- Versión: v3.0
- Estado: done
- Dependencias: V30-PED-001

**Descripción:** Implementar las transiciones de estado del pedido: borrador → confirmado → entregado → (facturado), y borrador/confirmado → cancelado. Cada transición tiene efectos en stock.

**Criterios de aceptación:**
- [x] API route `PATCH /api/pedidos/[id]/estado` con validación de transiciones
- [x] Confirmar: valida que hay stock suficiente para todos los items
- [x] Entregar: descuenta stock via `registrar_movimiento` con referencia `pedido`
- [x] Cancelar: válido desde borrador o confirmado (no entregado)
- [x] Transiciones inválidas retornan 400 con mensaje claro
- [x] Botones de acción en la UI según estado actual

**Notas técnicas:** Mapa de transiciones y código en `pedidos.md`.

---

## V30-PED-003 — Stock comprometido (vista dinámica) (hecho)

- Tipo: feature
- Módulo: pedidos
- Prioridad: high
- Estimación: 3
- Versión: v3.0
- Estado: done
- Dependencias: V30-PED-002

**Descripción:** Implementar el cálculo de stock comprometido (pedidos confirmados no entregados) y mostrarlo en la UI de productos.

**Criterios de aceptación:**
- [x] Vista SQL `v_stock_comprometido` o query dinámica que suma cantidades de pedidos confirmados por producto
- [x] En el detalle del producto: "Stock actual: 100 | Comprometido: 25 | Disponible: 75"
- [x] En la tabla de productos: columna "Disponible" (stock_actual - comprometido)
- [x] Al confirmar un pedido, el stock comprometido se actualiza

**Notas técnicas:** Vista y función en `pedidos.md`.

---

## V30-PED-004 — Conversión de pedido a factura (hecho)

- Tipo: feature
- Módulo: pedidos
- Prioridad: high
- Estimación: 5
- Versión: v3.0
- Estado: done
- Dependencias: V30-PED-002, V15-FAC-006

**Descripción:** Permitir generar una factura desde un pedido entregado con un click. El stock no se descuenta de nuevo (ya se descontó al entregar). El comprobante se vincula al pedido.

**Criterios de aceptación:**
- [x] API route `POST /api/pedidos/[id]/facturar` crea comprobante desde pedido
- [x] Solo pedidos en estado `entregado` pueden facturarse
- [x] No descuenta stock de nuevo (ya se hizo al entregar)
- [x] El usuario elige tipo de factura (A/B/C)
- [x] Se genera PDF y se sube a Storage
- [x] `pedido.comprobante_id` se actualiza con el ID del comprobante
- [x] Un pedido no puede facturarse dos veces (409 si ya tiene `comprobante_id`)
- [x] En la UI, botón "Generar factura" visible solo en pedidos entregados sin factura

**Notas técnicas:** Código completo en `pedidos.md`.

---

## V30-PED-005 — Presupuestos y conversión a pedido/factura (hecho)

- Tipo: feature
- Módulo: pedidos
- Prioridad: high
- Estimación: 5
- Versión: v3.0
- Estado: done
- Dependencias: V30-PED-001, V15-FAC-006

**Descripción:** Los presupuestos son comprobantes tipo `presupuesto` que no afectan stock. Se pueden convertir a pedido (hereda items) o directamente a factura.

**Criterios de aceptación:**
- [x] Emitir presupuesto reutiliza el flujo de facturación con tipo `presupuesto`
- [x] API route `POST /api/presupuestos/[id]/convertir-a-pedido` crea pedido borrador con mismos items
- [x] API route `POST /api/presupuestos/[id]/convertir-a-factura` crea comprobante directo
- [x] Guard de módulo: requiere `presupuestos`
- [x] En listado de presupuestos, botones "Convertir a pedido" y "Convertir a factura"
- [x] El presupuesto original se conserva (no se borra)

**Notas técnicas:** Código en `pedidos.md`.

---

## V30-IA-001 — Cliente Gemini y prompt de extracción (hecho)

- Tipo: feature
- Módulo: ia
- Prioridad: critical
- Estimación: 3
- Versión: v3.0
- Estado: done
- Dependencias: V01-INFRA-002

**Descripción:** Implementar el cliente REST para Gemini 1.5 Pro y los prompts de extracción de precios desde PDF/imagen.

**Criterios de aceptación:**
- [x] Función `llamarGemini(prompt, archivo)` envía base64 + prompt y retorna texto
- [x] Temperatura 0.1 para máxima consistencia
- [x] `responseMimeType: 'application/json'` para forzar JSON
- [x] Max output tokens: 8192
- [x] Prompts definidos en `src/lib/ia/prompts.ts`
- [x] Manejo de errores: API key inválida, timeout, respuesta no-JSON

**Notas técnicas:** Código en `ia-precios.md`. Requiere variable `GEMINI_API_KEY`.

---

## V30-IA-002 — API de extracción desde PDF/imagen (hecho)

- Tipo: feature
- Módulo: ia
- Prioridad: critical
- Estimación: 5
- Versión: v3.0
- Estado: done
- Dependencias: V30-IA-001

**Descripción:** Implementar la API route que recibe un PDF o imagen, lo envía a Gemini, parsea la respuesta JSON y retorna productos normalizados listos para el preview.

**Criterios de aceptación:**
- [x] API route `POST /api/ia/extraer` acepta FormData con archivo
- [x] Valida formato (PDF, JPG, PNG, WebP) y tamaño (máx 20 MB)
- [x] Guard de módulo: requiere `ia_precios`
- [x] Convierte archivo a base64 y llama a Gemini
- [x] Parsea JSON de respuesta (con fallback si viene con texto extra)
- [x] Normaliza productos: trim, precios numéricos, filtra nombres vacíos
- [x] Response: `{ productos, total_extraidos, total_validos, archivo_nombre }`
- [x] Errores descriptivos si Gemini falla o no devuelve JSON válido

**Notas técnicas:** Código completo en `ia-precios.md`.

---

## V30-IA-003 — UI de extracción IA con preview reutilizado (hecho)

- Tipo: feature
- Módulo: ia
- Prioridad: high
- Estimación: 5
- Versión: v3.0
- Estado: done
- Dependencias: V30-IA-002, V10-IMP-005

**Descripción:** Crear la página `/ia-precios` con upload de PDF/imagen, indicador de progreso, y reutilización del preview de importación para revisar y confirmar los datos extraídos.

**Criterios de aceptación:**
- [x] Componente de upload específico para IA (acepta PDF, JPG, PNG, WebP)
- [x] Spinner/loader durante la extracción (5-30 segundos)
- [x] Los datos extraídos se muestran en el mismo `PreviewTable` del importador
- [x] El usuario puede editar, descartar filas y corregir precios
- [x] Al confirmar, llama a `POST /api/importar/ejecutar` con `origen: 'ia_pdf'`
- [x] Resumen final con métricas (creados, actualizados, errores)

**Notas técnicas:** Componente `ExtraerPrecios` en `ia-precios.md`. Reutiliza pipeline de importación.

---

## V30-IA-004 — Preview de cambios de precio (subieron/bajaron) (hecho)

- Tipo: feature
- Módulo: ia
- Prioridad: high
- Estimación: 3
- Versión: v3.0
- Estado: done
- Dependencias: V30-IA-003

**Descripción:** Cuando la importación IA actualiza productos existentes, mostrar un preview que resalta qué precios subieron, bajaron o se mantuvieron, con la variación porcentual.

**Criterios de aceptación:**
- [x] Componente `PrecioCambioPreview` con tabla: producto, precio anterior → nuevo, variación %
- [x] Filas coloreadas: rojo si subió, verde si bajó, gris si sin cambio
- [x] Resumen: "X subieron, Y bajaron, Z sin cambio"
- [x] Ordenado por mayor variación absoluta
- [x] Se muestra antes de confirmar la importación

**Notas técnicas:** Componente en `ia-precios.md`.

---

## V30-IA-005 — Historial de precios y sugerencia de márgenes (hecho)

- Tipo: feature
- Módulo: ia
- Prioridad: medium
- Estimación: 5
- Versión: v3.0
- Estado: done
- Dependencias: V30-IA-003

**Descripción:** Página de historial de precios con filtros, y función de sugerencia de precio de venta basada en el margen habitual del producto o de su categoría.

**Criterios de aceptación:**
- [x] API route `GET /api/precios/historial` con filtros por producto y origen
- [x] Página `/ia-precios/historial` con tabla: fecha, producto, origen (badge), costo ant/nuevo, venta ant/nuevo, margen
- [x] Filtros por origen (manual, excel, IA) y por producto
- [x] Función `sugerirPrecioVenta(supabase, productoId, nuevoCosto)` retorna precio sugerido
- [x] Lógica: margen actual del producto → margen promedio de la categoría → fallback 30%
- [x] En el preview de importación, mostrar precio sugerido junto al extraído

**Notas técnicas:** Código en `ia-precios.md`.

---

## V30-IA-006 — Límite mensual de extracciones IA por tenant (hecho)

- Tipo: feature
- Módulo: ia
- Prioridad: medium
- Estimación: 2
- Versión: v3.0
- Estado: done
- Dependencias: V30-IA-002

**Descripción:** Implementar un límite mensual de extracciones IA por tenant para controlar costos de la API de Gemini.

**Criterios de aceptación:**
- [x] Función `verificarLimiteIA(supabase)` cuenta registros de `importacion_log` con `origen = 'ia_pdf'` del mes actual
- [x] Límite default: 50 extracciones/mes (configurable)
- [x] Si se supera, la API retorna 429 con mensaje "Límite mensual de extracciones alcanzado"
- [x] En la UI, mostrar "X/50 extracciones usadas este mes"
- [x] Advertencia visual cuando quedan menos de 5

**Notas técnicas:** Código en `ia-precios.md`.

---

## V40-ARCA-001 — Configuración ARCA (certificados y datos) (hecho)

- Tipo: feature
- Módulo: arca
- Prioridad: critical
- Estimación: 5
- Versión: v4.0
- Estado: done
- Dependencias: V20-UI-002, V15-FAC-011

**Descripción:** Crear la página `/configuracion/arca` donde el admin sube certificado y clave privada, configura CUIT, punto de venta y ambiente. Los certificados se encriptan con AES-256-CBC antes de guardar.

**Criterios de aceptación:**
- [ ] Página `/configuracion/arca` con formulario
- [ ] Upload de certificado .pem y clave privada .key
- [ ] Campos: CUIT emisor, punto de venta, ambiente (homologación/producción)
- [ ] Los certificados se encriptan con `encriptarCampo()` antes del INSERT
- [ ] Guard de módulo: requiere `facturador_arca`
- [ ] Solo admin puede acceder
- [ ] Se guarda en tabla `arca_config` (UPSERT por tenant_id)

**Notas técnicas:** Funciones de crypto en `arca.md`.

---

## V40-ARCA-002 — Implementar WSAA (autenticación con certificado) (hecho)

- Tipo: feature
- Módulo: arca
- Prioridad: critical
- Estimación: 8
- Versión: v4.0
- Estado: done
- Dependencias: V40-ARCA-001

**Descripción:** Implementar el flujo completo de WSAA: construir TRA XML, firmar con CMS/PKCS#7, enviar a WSAA, parsear respuesta, guardar ticket.

**Criterios de aceptación:**
- [ ] Instalar `node-forge` para firma PKCS#7
- [ ] Función `obtenerTicketAcceso(cert, key, ambiente)` retorna token + sign + expiracion
- [ ] TRA XML con uniqueId, generationTime, expirationTime, service=wsfe
- [ ] Firma CMS con el certificado y clave privada del tenant
- [ ] Envío SOAP al endpoint de WSAA (homo o prod según config)
- [ ] Parseo de respuesta: extraer token, sign y expiration del XML
- [ ] Guardar ticket en `arca_config`
- [ ] Log de la operación en `arca_log`

**Notas técnicas:** Código en `arca.md`. WSAA endpoint cambia según ambiente.

---

## V40-ARCA-003 — Renovación automática de ticket WSAA (hecho)

- Tipo: feature
- Módulo: arca
- Prioridad: critical
- Estimación: 3
- Versión: v4.0
- Estado: done
- Dependencias: V40-ARCA-002

**Descripción:** Antes de cada operación con WSFE, verificar si el ticket sigue vigente (con 5 minutos de margen) y renovarlo si expiró.

**Criterios de aceptación:**
- [ ] Función `asegurarTicketVigente(supabase, tenantId)` verifica expiración
- [ ] Si faltan menos de 5 minutos para expirar, renueva proactivamente
- [ ] Si el ticket es válido, lo retorna sin hacer request a WSAA
- [ ] Si la renovación falla, lanza error descriptivo
- [ ] Log de renovación en `arca_log`

**Notas técnicas:** Código en `arca.md`.

---

## V40-ARCA-004 — Implementar WSFE (solicitar CAE) (hecho)

- Tipo: feature
- Módulo: arca
- Prioridad: critical
- Estimación: 8
- Versión: v4.0
- Estado: done
- Dependencias: V40-ARCA-003

**Descripción:** Implementar la operación `FECAESolicitar` de WSFE: construir XML del comprobante, enviar, parsear respuesta con CAE o errores.

**Criterios de aceptación:**
- [ ] Función `solicitarCAE(supabase, config, solicitud)` envía comprobante a ARCA
- [ ] XML builder con todos los campos: tipo cbte, pto venta, concepto, doc receptor, importes, alícuotas IVA
- [ ] Mapeo de tipos SmartStock a códigos ARCA (factura_a=1, factura_b=6, factura_c=11, etc.)
- [ ] Mapeo de documento receptor (CUIT=80, DNI=96, sin_identificar=99)
- [ ] Parseo de respuesta: CAE, CAEFchVto, Resultado, Errores, Observaciones
- [ ] Timeout de 30 segundos en el request
- [ ] Log completo (request XML + response XML) en `arca_log`

**Notas técnicas:** XML builder y tipos en `arca.md`.

---

## V40-ARCA-005 — Integrar ARCA en el flujo de emisión (hecho)

- Tipo: feature
- Módulo: arca
- Prioridad: critical
- Estimación: 5
- Versión: v4.0
- Estado: done
- Dependencias: V40-ARCA-004, V15-FAC-006

**Descripción:** Extender la API de emisión de comprobantes para que, si el módulo `facturador_arca` está activo, solicite CAE después de crear el comprobante. Manejar los 3 escenarios: aprobado, rechazado, timeout.

**Criterios de aceptación:**
- [ ] Si `modulo_config.facturador_arca = true`, después de emitir localmente se solicita CAE
- [ ] Si ARCA aprueba: guardar CAE + vencimiento, regenerar PDF con CAE, estado = `emitido`
- [ ] Si ARCA rechaza: estado = `error_arca`, guardar errores en `arca_log`, notificar al usuario
- [ ] Si timeout/error de red: estado = `pendiente_arca`, entra a cola de reintentos
- [ ] Si ARCA no está activo, el flujo sigue igual que antes (facturador simple)
- [ ] El comprobante local siempre se crea (la operación del negocio no se bloquea)

**Notas técnicas:** Diagrama de estados en `arca.md`.

---

## V40-ARCA-006 — Consultar último comprobante en ARCA (hecho)

- Tipo: feature
- Módulo: arca
- Prioridad: high
- Estimación: 2
- Versión: v4.0
- Estado: done
- Dependencias: V40-ARCA-004

**Descripción:** Implementar la operación `FECompUltimoAutorizado` para sincronizar la numeración local con ARCA y detectar inconsistencias.

**Criterios de aceptación:**
- [ ] Función `consultarUltimoComprobante(supabase, config, tipo)` retorna el último número
- [ ] Botón "Sincronizar numeración" en `/configuracion/arca`
- [ ] Si hay discrepancia entre local y ARCA, mostrar advertencia
- [ ] Actualizar `arca_config.ultimo_comprobante` con el valor de ARCA

**Notas técnicas:** XML en `arca.md`.

---

## V40-ARCA-007 — Cola de reintentos con Edge Function cron

- Tipo: feature
- Módulo: arca
- Prioridad: critical
- Estimación: 5
- Versión: v4.0
- Estado: todo
- Dependencias: V40-ARCA-005

**Descripción:** Crear la Edge Function que corre cada 15 minutos y procesa comprobantes en estado `pendiente_arca`, reintentando hasta 3 veces.

**Criterios de aceptación:**
- [ ] Edge Function `reintentar-arca` en `supabase/functions/`
- [ ] Cron cada 15 minutos via configuración de Supabase
- [ ] Busca comprobantes con `estado = 'pendiente_arca'` (máx 10 por ciclo)
- [ ] Cuenta reintentos previos en `arca_log`
- [ ] Si < 3 reintentos: intenta solicitar CAE de nuevo
- [ ] Si >= 3 reintentos: marca como `error_arca` y registra en log
- [ ] Variables de entorno configuradas: `SUPABASE_SERVICE_ROLE_KEY`, `ARCA_ENCRYPTION_KEY`

**Notas técnicas:** Código en `arca.md`.

---

## V40-ARCA-008 — Regenerar PDF con CAE y código de barras

- Tipo: feature
- Módulo: arca
- Prioridad: high
- Estimación: 3
- Versión: v4.0
- Estado: todo
- Dependencias: V40-ARCA-005

**Descripción:** Cuando ARCA aprueba un comprobante, regenerar el PDF incluyendo el CAE, fecha de vencimiento del CAE, y el código de barras fiscal.

**Criterios de aceptación:**
- [ ] El PDF incluye sección "CAE: XXXXXXXXXXXXXXXX" y "Vencimiento CAE: DD/MM/YYYY"
- [ ] El PDF regenerado reemplaza al anterior en Supabase Storage
- [ ] `comprobante.pdf_url` se actualiza con la nueva versión
- [ ] La función `generarPDF` ya acepta datos de CAE (implementado en V15-FAC-004)

**Notas técnicas:** El generador de PDF ya tiene soporte para CAE. Solo hay que llamarlo de nuevo después de obtener el CAE.

---

## V40-ARCA-009 — Alerta de vencimiento de certificado ARCA

- Tipo: feature
- Módulo: arca
- Prioridad: medium
- Estimación: 2
- Versión: v4.0
- Estado: todo
- Dependencias: V40-ARCA-001

**Descripción:** Verificar la fecha de vencimiento del certificado ARCA y alertar al admin cuando faltan 30 días o menos.

**Criterios de aceptación:**
- [ ] Función `verificarVencimientoCertificado(pem)` retorna días restantes y si es válido
- [ ] Alerta en el dashboard si faltan <= 30 días
- [ ] Banner en `/configuracion/arca` con mensaje de urgencia si faltan <= 7 días
- [ ] Si el certificado ya expiró, mostrar error y bloquear emisión ARCA

**Notas técnicas:** Código en `arca.md`. Usar `crypto.X509Certificate` de Node.js.

---

## V40-ARCA-010 — Botón "Probar conexión" con ARCA

- Tipo: feature
- Módulo: arca
- Prioridad: high
- Estimación: 2
- Versión: v4.0
- Estado: todo
- Dependencias: V40-ARCA-002

**Descripción:** En la página de configuración ARCA, agregar un botón que testea la conexión: intenta obtener un ticket WSAA y consultar el último comprobante.

**Criterios de aceptación:**
- [ ] Botón "Probar conexión" en `/configuracion/arca`
- [ ] Intenta: 1) obtener ticket WSAA, 2) consultar `FECompUltimoAutorizado`
- [ ] Si éxito: mensaje verde con "Conexión exitosa. Último comprobante: #XXX"
- [ ] Si falla WSAA: mensaje rojo con detalle del error
- [ ] Si falla WSFE: mensaje naranja con detalle
- [ ] Log de la prueba en `arca_log`

**Notas técnicas:** Usa las funciones de `wsaa.ts` y `wsfe.ts`.

---

## V40-TEST-001 — Tests de integración ARCA contra homologación

- Tipo: test
- Módulo: arca
- Prioridad: high
- Estimación: 8
- Versión: v4.0
- Estado: todo
- Dependencias: V40-ARCA-005

**Descripción:** Tests end-to-end contra el ambiente de homologación de ARCA. Requiere certificado de homologación configurado.

**Criterios de aceptación:**
- [ ] Test: obtener ticket WSAA con certificado de homologación
- [ ] Test: consultar último comprobante con `FECompUltimoAutorizado`
- [ ] Test: emitir Factura C y obtener CAE válido
- [ ] Test: emitir Factura B y obtener CAE válido
- [ ] Test: emitir Nota de Crédito y obtener CAE válido
- [ ] Test: enviar datos inválidos y verificar que ARCA rechaza con error descriptivo
- [ ] Tests se ejecutan solo con flag especial (no en CI normal): `npm test -- --group=arca`

**Notas técnicas:** Requiere certificado de homologación. Ver instrucciones en `deploy.md`.

---

## V40-TEST-002 — Tests de la cola de reintentos

- Tipo: test
- Módulo: arca
- Prioridad: high
- Estimación: 3
- Versión: v4.0
- Estado: todo
- Dependencias: V40-ARCA-007

**Descripción:** Tests que verifican el comportamiento de la cola de reintentos: reintento exitoso, máximo de reintentos, transición a `error_arca`.

**Criterios de aceptación:**
- [ ] Test: comprobante `pendiente_arca` es procesado por la cola
- [ ] Test: después de 3 reintentos fallidos, pasa a `error_arca`
- [ ] Test: reintento exitoso actualiza CAE y estado a `emitido`
- [ ] Test: la cola procesa máximo 10 comprobantes por ciclo

**Notas técnicas:** Mockear las respuestas de ARCA para simular timeouts y errores.

---

# BLOQUE F — v6.0 (Códigos de barra + POS con escáner)

---

## V60-POS-001 — Migración: columnas codigo_barras, plu y es_pesable en producto (hecho)

- Tipo: migration
- Módulo: pos
- Prioridad: critical
- Estimación: 3
- Versión: v6.0
- Estado: done
- Dependencias: V50-ANAL-005

**Descripción:** Agregar tres columnas nuevas a la tabla `producto`: `codigo_barras` (VARCHAR(14), nullable), `plu` (VARCHAR(5), nullable) y `es_pesable` (BOOLEAN, default false). Crear índices UNIQUE parciales y CHECK constraints para garantizar consistencia.

**Criterios de aceptación:**
- [x] Columna `codigo_barras` VARCHAR(14) nullable agregada a `producto`
- [x] Columna `plu` VARCHAR(5) nullable agregada a `producto`
- [x] Columna `es_pesable` BOOLEAN DEFAULT false agregada a `producto`
- [x] Índice UNIQUE parcial `idx_producto_barcode_tenant` sobre `(tenant_id, codigo_barras)` WHERE `codigo_barras IS NOT NULL AND activo = true`
- [x] Índice UNIQUE parcial `idx_producto_plu_tenant` sobre `(tenant_id, plu)` WHERE `plu IS NOT NULL AND activo = true`
- [x] CHECK constraint `chk_plu_requiere_pesable`: `plu IS NULL OR es_pesable = true`
- [x] CHECK constraint `chk_pesable_unidad`: `es_pesable = false OR unidad IN ('kg', 'gramo')`
- [x] Migración ejecuta sin errores sobre el schema existente

**Notas técnicas:** Archivo `supabase/migrations/023_producto_barcode.sql`. Los índices parciales siguen el patrón existente del sistema (ver `idx_producto_codigo_tenant`). Los 14 dígitos cubren EAN-13 y futura compatibilidad con ITF-14.

---

## V60-POS-002 — Migración: cantidad INTEGER → NUMERIC(12,3) en movimiento, comprobante_item y pedido_item

- Tipo: migration
- Módulo: pos
- Prioridad: critical
- Estimación: 5
- Versión: v6.0
- Estado: todo
- Dependencias: V60-POS-001

**Descripción:** Migrar el tipo de dato de la columna `cantidad` de INTEGER a NUMERIC(12,3) en las tablas `movimiento`, `comprobante_item` y `pedido_item` para soportar productos pesables con cantidades decimales (ej: 0.450 kg). Ajustar los constraints existentes y las columnas de stock en `movimiento`.

**Criterios de aceptación:**
- [ ] `movimiento.cantidad` migrada de INTEGER a NUMERIC(12,3)
- [ ] `movimiento.stock_anterior` migrada de INTEGER a NUMERIC(12,3)
- [ ] `movimiento.stock_posterior` migrada de INTEGER a NUMERIC(12,3)
- [ ] `comprobante_item.cantidad` migrada de INTEGER a NUMERIC(12,3)
- [ ] `pedido_item.cantidad` migrada de INTEGER a NUMERIC(12,3)
- [ ] `producto.stock_actual` migrada de INTEGER a NUMERIC(12,3)
- [ ] `producto.stock_minimo` migrada de INTEGER a NUMERIC(12,3)
- [ ] Constraint `chk_cantidad_positiva` ajustado para semántica decimal (`cantidad > 0`)
- [ ] Constraint `chk_item_positivo` ajustado para semántica decimal
- [ ] Constraint `chk_pedido_item_positivo` ajustado para semántica decimal
- [ ] Constraint `chk_stock_positivo` ajustado (`stock_actual >= 0`)
- [ ] Datos existentes preservados sin pérdida (INTEGER → NUMERIC es un cast seguro)

**Notas técnicas:** Archivo `supabase/migrations/024_cantidad_decimal.sql`. NUMERIC(12,3) permite hasta 999.999.999,999 con precisión de milésimas (gramo). Los constraints se recrean con `ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT`. Es la migración más invasiva del bloque porque toca tablas core.

---

## V60-POS-003 — Migración: flag facturador_pos en modulo_config + activar_plan

- Tipo: migration
- Módulo: pos
- Prioridad: critical
- Estimación: 3
- Versión: v6.0
- Estado: todo
- Dependencias: V60-POS-001

**Descripción:** Agregar la columna `facturador_pos` (BOOLEAN, default false) a `modulo_config`. Crear CHECK constraint que obliga a tener `facturador_simple = true` si `facturador_pos = true`. Actualizar la función `activar_plan` para setear este flag en true con plan completo y false con plan base.

**Criterios de aceptación:**
- [ ] Columna `facturador_pos` BOOLEAN DEFAULT false agregada a `modulo_config`
- [ ] CHECK constraint `chk_pos_requiere_facturador`: `facturador_pos = false OR facturador_simple = true`
- [ ] Función `activar_plan` actualizada: plan completo activa `facturador_pos = true`, plan base desactiva `facturador_pos = false`
- [ ] RLS policies de `modulo_config` siguen funcionando correctamente
- [ ] Migración es idempotente y no rompe tenants existentes

**Notas técnicas:** Archivo `supabase/migrations/025_facturador_pos.sql`. Sigue el mismo patrón que `chk_arca_requiere_facturador`.

---

## V60-POS-004 — Actualizar función registrar_movimiento para NUMERIC

- Tipo: migration
- Módulo: pos
- Prioridad: critical
- Estimación: 2
- Versión: v6.0
- Estado: todo
- Dependencias: V60-POS-002

**Descripción:** Actualizar la firma y tipos internos de la función SQL `registrar_movimiento`: los parámetros `p_cantidad`, variables `v_stock_anterior` y `v_stock_posterior` pasan de INTEGER a NUMERIC(12,3). La lógica interna no cambia.

**Criterios de aceptación:**
- [ ] Parámetro `p_cantidad` cambia de INTEGER a NUMERIC(12,3)
- [ ] Variables `v_stock_anterior` y `v_stock_posterior` cambian a NUMERIC(12,3)
- [ ] La función sigue sumando/restando/asignando correctamente con decimales
- [ ] `FOR UPDATE` sigue previniendo race conditions
- [ ] Error de stock insuficiente sigue funcionando con valores decimales
- [ ] Tests existentes de movimiento siguen pasando

**Notas técnicas:** Se usa `CREATE OR REPLACE FUNCTION` para actualizar sin borrar la función existente. Incluir en la misma migración `024_cantidad_decimal.sql` o en una separada si conviene.

---

## V60-POS-005 — Regenerar tipos TypeScript de Supabase

- Tipo: setup
- Módulo: infra
- Prioridad: critical
- Estimación: 1
- Versión: v6.0
- Estado: todo
- Dependencias: V60-POS-001, V60-POS-002, V60-POS-003, V60-POS-004

**Descripción:** Ejecutar `npm run gen:types` para regenerar `src/types/database.ts` con las nuevas columnas de producto, el tipo NUMERIC en cantidad, el flag `facturador_pos` y los nuevos valores de ENUM.

**Criterios de aceptación:**
- [ ] `src/types/database.ts` regenerado con `codigo_barras`, `plu`, `es_pesable` en producto
- [ ] `cantidad` aparece como `number` (no integer) en movimiento, comprobante_item, pedido_item
- [ ] `stock_actual` y `stock_minimo` aparecen como `number` en producto
- [ ] `facturador_pos` aparece en modulo_config
- [ ] El tipo `tipo_comprobante` incluye `ticket` (si se agregó en migración)
- [ ] Autocompletado funciona en el IDE para las nuevas columnas
- [ ] Build de TypeScript compila sin errores

**Notas técnicas:** Requiere que las migraciones se hayan ejecutado en el proyecto Supabase remoto o local antes de regenerar.

---

## V60-POS-006 — Librería de generación y validación EAN-13

- Tipo: feature
- Módulo: pos
- Prioridad: critical
- Estimación: 3
- Versión: v6.0
- Estado: todo
- Dependencias: V60-POS-005

**Descripción:** Construir módulo de librería en `src/lib/pos/ean13.ts` con funciones puras para calcular dígito verificador EAN-13, validar códigos completos, generar EAN-13 internos con prefijo `20`, y formatear para display.

**Criterios de aceptación:**
- [ ] Función `calcularCheckDigitEAN13(digits12: string): string` implementa fórmula GS1 módulo 10
- [ ] Función `validarEAN13(code: string): boolean` valida longitud, solo dígitos y check digit correcto
- [ ] Función `generarEAN13Interno(secuencial: number): string` genera con prefijo `20` + padding + check digit
- [ ] Función `formatearEAN13(code: string): string` devuelve formato visual separado en grupos
- [ ] Tests con Vitest: códigos argentinos (prefijo 779), internos (prefijo 20), inválidos por longitud, por caracteres, por check digit
- [ ] Cobertura del 100% de las funciones (lógica crítica)
- [ ] Todas las funciones son puras (sin I/O, sin estado)

**Notas técnicas:** Archivo `src/lib/pos/ean13.ts`, tests en `src/test/ean13.test.ts`. Rango 20-29 de GS1 es de uso interno y no se emite a fabricantes reales.

---

## V60-POS-007 — Parser de código escaneado (parseBarcode)

- Tipo: feature
- Módulo: pos
- Prioridad: critical
- Estimación: 3
- Versión: v6.0
- Estado: todo
- Dependencias: V60-POS-006

**Descripción:** Construir función `parseBarcode(input: string)` en `src/lib/pos/barcode-parser.ts` que recibe el string del escáner y devuelve tipo de código (ean_normal, balanza_peso, desconocido), código de lookup para la DB, y peso en kg si aplica.

**Criterios de aceptación:**
- [ ] Función `parseBarcode` implementada con tipos `BarcodeType` y `ParsedBarcode`
- [ ] Códigos de 13 dígitos que empiezan con `2`: extraer PLU (dígitos 2-6) y peso en gramos (dígitos 7-11), tipo `balanza_peso`
- [ ] Códigos numéricos de 8-14 dígitos (no balanza): tipo `ean_normal`, codigoLookup = input
- [ ] Strings alfanuméricos: tipo `ean_normal`, codigoLookup = input (para buscar por SKU)
- [ ] Strings vacíos o inválidos: tipo `desconocido`
- [ ] Tests con Vitest: códigos de balanza reales, EAN normales, SKU alfanuméricos, vacíos, inválidos
- [ ] Función pura, compartida entre frontend y backend

**Notas técnicas:** Archivo `src/lib/pos/barcode-parser.ts`, tests en `src/test/barcode-parser.test.ts`. El formato de balanza argentino: `2PPPPPGGGGGC` donde P=PLU, G=gramos, C=check digit.

---

## V60-POS-008 — API: asignar código de barras a producto

- Tipo: feature
- Módulo: pos
- Prioridad: high
- Estimación: 3
- Versión: v6.0
- Estado: todo
- Dependencias: V60-POS-006

**Descripción:** Crear endpoint `POST /api/productos/[id]/codigo-barras` que asigna o actualiza el código de barras de un producto existente, con validaciones de autenticación, módulo, rol, y duplicados.

**Criterios de aceptación:**
- [ ] Endpoint acepta `{ codigo: string }` en el body
- [ ] Valida autenticación, módulo `facturador_pos`, y rol no visor
- [ ] Valida que el producto exista y pertenezca al tenant
- [ ] Si el código pasa validación EAN-13, lo acepta sin warning
- [ ] Si no pasa EAN-13 pero es numérico, lo acepta con `{ warning: "..." }`
- [ ] Si el código ya existe en otro producto activo del tenant, retorna 409 con producto duplicado
- [ ] Guarda el código en `producto.codigo_barras`

**Notas técnicas:** Ruta `src/app/api/productos/[id]/codigo-barras/route.ts`. Usar `validarEAN13` de la librería.

---

## V60-POS-009 — API: generar EAN-13 interno automático

- Tipo: feature
- Módulo: pos
- Prioridad: high
- Estimación: 3
- Versión: v6.0
- Estado: todo
- Dependencias: V60-POS-006

**Descripción:** Crear endpoint `POST /api/productos/[id]/generar-codigo` que genera automáticamente un EAN-13 interno con prefijo `20` para un producto, usando el siguiente secuencial del tenant.

**Criterios de aceptación:**
- [ ] Obtiene siguiente secuencial del tenant (MAX de códigos existentes con prefijo `20` + 1)
- [ ] Genera EAN-13 con prefijo `20` + padding + check digit
- [ ] Guarda en `producto.codigo_barras`
- [ ] Si el producto ya tiene código, retorna 400 pidiendo confirmación
- [ ] Retorna el EAN-13 generado en la respuesta
- [ ] Guard de módulo `facturador_pos` y rol no visor

**Notas técnicas:** Ruta `src/app/api/productos/[id]/generar-codigo/route.ts`. Usar `generarEAN13Interno` de la librería.

---

## V60-POS-010 — Extender PATCH producto con campos barcode

- Tipo: feature
- Módulo: pos
- Prioridad: high
- Estimación: 2
- Versión: v6.0
- Estado: todo
- Dependencias: V60-POS-005

**Descripción:** Extender el endpoint `PATCH /api/productos/[id]` para aceptar los nuevos campos `codigo_barras`, `plu` y `es_pesable`. Aplicar validaciones de duplicado y consistencia pesable/unidad.

**Criterios de aceptación:**
- [ ] Acepta `codigo_barras`, `plu`, `es_pesable` en el body del PATCH
- [ ] Valida duplicado de `codigo_barras` contra otros productos activos del tenant
- [ ] Valida duplicado de `plu` contra otros productos activos del tenant
- [ ] Si `es_pesable` cambia a true, valida que unidad sea kg o gramo
- [ ] Si `es_pesable` cambia a false, nulifica `plu` automáticamente
- [ ] Los campos son opcionales (no rompe el PATCH existente)

**Notas técnicas:** Modificar `src/app/api/productos/[id]/route.ts`.

---

## V60-POS-011 — UI: sección "Códigos y escaneo" en formulario de producto

- Tipo: feature
- Módulo: pos
- Prioridad: high
- Estimación: 5
- Versión: v6.0
- Estado: todo
- Dependencias: V60-POS-008, V60-POS-009, V60-POS-010

**Descripción:** Agregar sección "Códigos y escaneo" en las pantallas `/productos/nuevo` y `/productos/[id]` con campos para código de barras (con botón generar), checkbox pesable, campo PLU, e indicador de validación en tiempo real.

**Criterios de aceptación:**
- [ ] Campo código de barras con input que acepta escaneo directo
- [ ] Botón "Generar" que llama al endpoint de generación automática
- [ ] Indicador de validación: vacío/gris, válido/verde, warning/amarillo, duplicado/rojo
- [ ] Validación al blur (no en cada keystroke)
- [ ] Checkbox "Es producto pesable (balanza)" con cambio automático de unidad a kg
- [ ] Campo PLU visible solo si pesable está activo, acepta hasta 5 dígitos
- [ ] Sección solo visible si módulo `facturador_pos` está activo

**Notas técnicas:** Extender componentes existentes en `/productos/`. Usar `useModulos` para condicionalmente mostrar la sección.

---

## V60-POS-012 — Extender búsqueda de productos por código de barras

- Tipo: feature
- Módulo: pos
- Prioridad: medium
- Estimación: 2
- Versión: v6.0
- Estado: todo
- Dependencias: V60-POS-005

**Descripción:** Extender la búsqueda del listado de productos para que también busque por `codigo_barras`, además de nombre y SKU. Agregar columna opcional "Código de barras" a la tabla.

**Criterios de aceptación:**
- [ ] Búsqueda en `/productos` incluye `codigo_barras` en los criterios
- [ ] Columna "Código de barras" agregada a la tabla de productos
- [ ] La columna muestra el código formateado si existe, o vacío si no

**Notas técnicas:** Modificar el componente de listado y el endpoint de búsqueda.

---

## V60-POS-013 — Pantalla de impresión de etiquetas individual

- Tipo: feature
- Módulo: pos
- Prioridad: medium
- Estimación: 8
- Versión: v6.0
- Estado: todo
- Dependencias: V60-POS-011

**Descripción:** Crear pantalla `/productos/[id]/etiquetas` con preview de etiqueta (nombre, precio, código de barras SVG), selector de cantidad y tamaño, e impresión via `window.print()` con CSS de página optimizado.

**Criterios de aceptación:**
- [ ] Ruta `/productos/[id]/etiquetas` accesible desde el detalle del producto
- [ ] Preview visual de la etiqueta con nombre, precio y código de barras SVG (bwip-js)
- [ ] Selector de cantidad de copias (1, 5, 10, 20, custom)
- [ ] Selector de tamaño: 50x30mm, 80x40mm, A4 con grilla
- [ ] Botón "Imprimir" que abre diálogo nativo del navegador
- [ ] CSS de impresión con media queries para distribución en hoja
- [ ] Número humano-legible debajo del código de barras

**Notas técnicas:** Instalar `bwip-js`. Usar CSS `@media print` para layout de impresión.

---

## V60-POS-014 — Impresión masiva de etiquetas (lote)

- Tipo: feature
- Módulo: pos
- Prioridad: medium
- Estimación: 5
- Versión: v6.0
- Estado: todo
- Dependencias: V60-POS-013

**Descripción:** Agregar acción batch "Imprimir etiquetas de los seleccionados" en el listado de productos. Modal con los productos elegidos, copias por producto, y generación de grilla de etiquetas para impresión.

**Criterios de aceptación:**
- [ ] Acción batch en listado de productos: "Imprimir etiquetas"
- [ ] Modal con lista de productos seleccionados y copias por producto
- [ ] Generación de grilla de etiquetas distribuidas en hojas A4
- [ ] Botón "Imprimir" que abre diálogo nativo
- [ ] Reutiliza componentes de etiqueta individual

**Notas técnicas:** Reutilizar el renderizado de etiqueta de V60-POS-013.

---

## V60-POS-015 — Migración: tipo ticket + metodo_pago en comprobante

- Tipo: migration
- Módulo: pos
- Prioridad: critical
- Estimación: 3
- Versión: v6.0
- Estado: todo
- Dependencias: V60-POS-002

**Descripción:** Agregar valor `ticket` al ENUM `tipo_comprobante`. Agregar columnas `metodo_pago` (VARCHAR(20)), `metodo_pago_detalle` (JSONB) y `caja_id` (VARCHAR(20)) a la tabla `comprobante`.

**Criterios de aceptación:**
- [ ] Valor `ticket` agregado al ENUM `tipo_comprobante`
- [ ] Columna `metodo_pago` VARCHAR(20) nullable agregada a `comprobante`
- [ ] Columna `metodo_pago_detalle` JSONB nullable agregada a `comprobante`
- [ ] Columna `caja_id` VARCHAR(20) nullable agregada a `comprobante`
- [ ] Índice `idx_comprobante_numero` sigue funcionando con el nuevo tipo
- [ ] Migración no rompe comprobantes existentes

**Notas técnicas:** Archivo `supabase/migrations/026_pos_comprobante.sql`. ALTER TYPE con ADD VALUE para agregar al ENUM.

---

## V60-POS-016 — Componente `<BarcodeInput />`

- Tipo: feature
- Módulo: pos
- Prioridad: critical
- Estimación: 5
- Versión: v6.0
- Estado: todo
- Dependencias: V60-POS-005

**Descripción:** Construir componente reutilizable de captura de código de barras con autofoco, detección de escaneo por velocidad, y callback `onScan`.

**Criterios de aceptación:**
- [ ] Input con autofoco que se reenfoca automáticamente cada 500ms
- [ ] Detección de escaneo por velocidad (< 30ms entre caracteres)
- [ ] Al recibir Enter, pasa el buffer a `onScan` y se limpia
- [ ] Props: `onScan`, `autoFocus`, `disabled`, `placeholder`
- [ ] Buffer no atado al state de React (evitar rerenders)
- [ ] Ref al DOM node para gestión imperativa del foco
- [ ] Debounce de 300ms para evitar doble disparo del escáner

**Notas técnicas:** Archivo `src/components/pos/barcode-input.tsx`. Usar `useRef` para buffer y DOM node.

---

## V60-POS-017 — API: búsqueda de producto por código de barras

- Tipo: feature
- Módulo: pos
- Prioridad: critical
- Estimación: 3
- Versión: v6.0
- Estado: todo
- Dependencias: V60-POS-007

**Descripción:** Implementar `GET /api/productos/buscar-por-barcode?codigo=XXX` que usa `parseBarcode` para determinar el tipo de búsqueda y retorna el producto correspondiente.

**Criterios de aceptación:**
- [ ] `ean_normal`: busca por `codigo_barras`, luego por `codigo` (SKU) como fallback
- [ ] `balanza_peso`: busca por `plu` en productos pesables
- [ ] `desconocido`: retorna 404 con mensaje claro
- [ ] Respuesta incluye producto completo, tipo de código y peso si aplica
- [ ] 404 incluye el código buscado para mostrar en error
- [ ] Guard de módulo `facturador_pos`
- [ ] Solo retorna productos activos del tenant

**Notas técnicas:** Ruta `src/app/api/productos/buscar-por-barcode/route.ts`. Usar `parseBarcode` del módulo compartido.

---

## V60-POS-018 — Extender API de emisión para soportar POS

- Tipo: feature
- Módulo: pos
- Prioridad: critical
- Estimación: 5
- Versión: v6.0
- Estado: todo
- Dependencias: V60-POS-015, V60-POS-005

**Descripción:** Extender la ENTRADA del endpoint `POST /api/facturacion/emitir` para aceptar tipo `ticket`, campo `metodo_pago`, y cantidades decimales en los items. NO agregar lógica post-emisión.

**Criterios de aceptación:**
- [ ] Acepta tipo de comprobante `ticket`
- [ ] Acepta campo `metodo_pago` (efectivo, debito, credito, transferencia, mixto)
- [ ] Acepta campo opcional `metodo_pago_detalle` (JSONB para mixto)
- [ ] Cantidades decimales en items funcionan correctamente
- [ ] Guarda `metodo_pago` y `metodo_pago_detalle` en el comprobante
- [ ] Tipo `ticket` genera numeración propia separada
- [ ] NO se agrega lógica de ARCA ni post-emisión

**Notas técnicas:** Modificar `src/lib/facturacion/emitir-comprobante.ts` (solo entrada) y `src/lib/facturacion/tipo-comprobante.ts`. Regla crítica: no tocar el flujo ARCA.

---

## V60-POS-019 — POS: layout, barra superior y zona de escaneo

- Tipo: feature
- Módulo: pos
- Prioridad: critical
- Estimación: 8
- Versión: v6.0
- Estado: todo
- Dependencias: V60-POS-016, V60-POS-017, V60-POS-018

**Descripción:** Crear la pantalla base del POS en `/facturacion/pos` con layout fullscreen, barra superior (tenant, cliente, tipo comprobante), zona de escaneo con `<BarcodeInput />`, y estructura de dos columnas para carrito/resumen.

**Criterios de aceptación:**
- [ ] Layout fullscreen sin sidebar, tipografía grande
- [ ] Barra superior: nombre del tenant, selector de cliente, tipo de comprobante, fecha/hora, usuario
- [ ] Zona de escaneo con `<BarcodeInput />` centrado
- [ ] Feedback visual del último producto escaneado
- [ ] Botón "Buscar" alternativo para búsqueda textual
- [ ] Estructura de dos columnas (65% items, 35% resumen)
- [ ] Guard de módulo `facturador_pos` y página

**Notas técnicas:** Ruta `src/app/(dashboard)/facturacion/pos/page.tsx`. Layout sin sidebar usando un layout especial.

---

## V60-POS-020 — POS: carrito de items y panel de totales

- Tipo: feature
- Módulo: pos
- Prioridad: critical
- Estimación: 8
- Versión: v6.0
- Estado: todo
- Dependencias: V60-POS-019

**Descripción:** Implementar la lista de items del carrito POS con cantidad editable, precio, subtotal por línea, eliminación, y el panel de resumen con subtotal/IVA/total y botón COBRAR.

**Criterios de aceptación:**
- [ ] Lista de items: cantidad editable, unidad, nombre, precio unitario, subtotal, botón X
- [ ] Resaltar último item escaneado con animación
- [ ] Placeholder "Escaneá el primer producto para empezar" cuando vacío
- [ ] Panel resumen: subtotal, IVA discriminado (para factura A), total en tipografía grande
- [ ] Campo descuento (% o monto fijo) aplicable al total
- [ ] Botón "COBRAR (F2)" que abre el modal de cobro
- [ ] Botón "Cancelar venta (F8)" con confirmación
- [ ] Lógica de escaneo: incrementar cantidad si ya está, o agregar nueva línea
- [ ] Para pesables con código de balanza: agregar con peso en kg
- [ ] Para pesables sin peso: modal de ingreso manual de peso

**Notas técnicas:** Componentes en `src/components/pos/`. El carrito es estado local del componente POS.

---

## V60-POS-021 — Modal de cobro

- Tipo: feature
- Módulo: pos
- Prioridad: critical
- Estimación: 8
- Versión: v6.0
- Estado: todo
- Dependencias: V60-POS-020

**Descripción:** Modal overlay con confirmación de tipo de comprobante, selección de método de pago (con cálculo de vuelto para efectivo), y emisión del comprobante via API existente.

**Criterios de aceptación:**
- [ ] Paso 1: confirmar tipo de comprobante (ticket/factura A/B/C)
- [ ] Si factura y cliente sin CUIT/DNI: sub-formulario para completar
- [ ] Paso 2: seleccionar método de pago con botones grandes
- [ ] Para efectivo: input "Recibido" con cálculo de vuelto en tiempo real
- [ ] Para mixto: distribución entre métodos
- [ ] Paso 3: botón "Confirmar cobro" que llama a la API de emisión
- [ ] Éxito: pantalla verde con número de comprobante, vuelto, opciones "Nueva venta" e "Imprimir"
- [ ] Error: pantalla roja manteniendo el carrito para reintentar

**Notas técnicas:** Componente `src/components/pos/checkout-modal.tsx`. Usa el endpoint existente `/api/facturacion/emitir`.

---

## V60-POS-022 — Impresión de ticket térmico

- Tipo: feature
- Módulo: pos
- Prioridad: high
- Estimación: 5
- Versión: v6.0
- Estado: todo
- Dependencias: V60-POS-021

**Descripción:** Generar HTML optimizado para impresora térmica (80mm/57mm) con datos del comprobante, y disparar impresión via `window.print()` en ventana oculta.

**Criterios de aceptación:**
- [ ] HTML con tipografía monoespaciada y ancho 80mm
- [ ] Contenido: cabecera tenant, tipo/número comprobante, fecha, items, totales, método de pago, pie fiscal
- [ ] Soporte para ancho 80mm y 57mm
- [ ] Impresión via `window.print()` en ventana oculta
- [ ] Modo alternativo: descarga PDF
- [ ] Número humano-legible para fallback

**Notas técnicas:** Componente `src/components/pos/ticket-printer.tsx`. CSS optimizado para impresión térmica.

---

## V60-POS-023 — Atajos de teclado y ergonomía

- Tipo: feature
- Módulo: pos
- Prioridad: medium
- Estimación: 3
- Versión: v6.0
- Estado: todo
- Dependencias: V60-POS-020

**Descripción:** Implementar atajos de teclado para operación sin mouse: F2 (cobrar), F4 (cambiar cliente), F8 (cancelar), Escape (cerrar modal), +/- (ajustar cantidad), Del (eliminar línea), F1 (ayuda).

**Criterios de aceptación:**
- [ ] F2: abre modal de cobro
- [ ] F4: abre selector de cliente
- [ ] F8: cancelar venta con confirmación
- [ ] Escape: cierra cualquier modal
- [ ] +/- en línea seleccionada: ajusta cantidad
- [ ] Del: elimina línea seleccionada
- [ ] F1 o ?: modal de ayuda con lista de atajos
- [ ] Atajos no interfieren con el input de escaneo

**Notas técnicas:** Hook `useKeyboardShortcuts` en `src/hooks/`. Registrar listeners globales con `useEffect`.

---

## V60-POS-024 — Manejo de casos borde del POS

- Tipo: feature
- Módulo: pos
- Prioridad: high
- Estimación: 5
- Versión: v6.0
- Estado: todo
- Dependencias: V60-POS-020

**Descripción:** Manejar explícitamente los casos borde: producto sin stock, producto inactivo, desconexión de red, doble disparo del escáner, pesable sin pesar.

**Criterios de aceptación:**
- [ ] Producto sin stock: warning visual o bloqueo según config del tenant
- [ ] Producto inactivo: 404 como si no existiera
- [ ] Desconexión de red: toast "Sin conexión" con reintentar, carrito intacto
- [ ] Doble disparo (< 300ms mismo código): ignorar segundo
- [ ] Pesable escaneado sin peso (SKU manual): modal de peso manual
- [ ] Error de red al emitir: bloquear emisión con mensaje, carrito intacto

**Notas técnicas:** Integrar con la configuración del tenant para el comportamiento de stock.

---

## V60-POS-025 — Persistencia del carrito en localStorage

- Tipo: feature
- Módulo: pos
- Prioridad: medium
- Estimación: 2
- Versión: v6.0
- Estado: todo
- Dependencias: V60-POS-020

**Descripción:** Persistir el carrito POS en `localStorage` automáticamente (debounced 500ms). Al recargar, si hay carrito sin emitir, preguntar "¿Restaurar venta en curso?".

**Criterios de aceptación:**
- [ ] Carrito se guarda en localStorage en cada cambio (debounced 500ms)
- [ ] Al cargar la página, detecta carrito previo y pregunta si restaurar
- [ ] Al emitir exitosamente, limpia el localStorage
- [ ] Al cancelar, limpia el localStorage
- [ ] Incluye timestamp para detectar carritos muy antiguos

**Notas técnicas:** Hook `useCartPersistence` con `useEffect` y debounce.

---

## V60-POS-026 — Configuración POS en /configuracion

- Tipo: feature
- Módulo: pos
- Prioridad: medium
- Estimación: 3
- Versión: v6.0
- Estado: todo
- Dependencias: V60-POS-019

**Descripción:** Agregar sección "POS" en `/configuracion` con opciones de sonidos, impresora, comportamiento ante falta de stock, y ancho de ticket.

**Criterios de aceptación:**
- [ ] Sección "POS" visible solo si módulo `facturador_pos` activo
- [ ] Toggle de sonidos (activar/desactivar beep al escanear)
- [ ] Selector de ancho de ticket: 80mm / 57mm
- [ ] Selector de comportamiento sin stock: bloquear / permitir con warning
- [ ] Las preferencias se guardan por tenant
- [ ] Flag `facturador_pos` visible en la sección "Plan / Módulos"

**Notas técnicas:** Extender `/configuracion` con nueva sección. Guardar en una columna JSONB o en una tabla de configuración dedicada.

---

## V60-POS-027 — Importador: aceptar columna código de barras

- Tipo: feature
- Módulo: pos
- Prioridad: low
- Estimación: 2
- Versión: v6.0
- Estado: todo
- Dependencias: V60-POS-005

**Descripción:** Extender el importador Excel/CSV para reconocer una columna opcional "Código de barras" en el mapeo, que se guarda en `producto.codigo_barras`.

**Criterios de aceptación:**
- [ ] Nueva columna "codigo_barras" disponible en el mapeo de importación
- [ ] Se guarda en `producto.codigo_barras` al importar
- [ ] Alias: "Código de barras", "EAN", "EAN-13", "Barcode", "Código barra"
- [ ] Validación: si el valor no es numérico, se ignora con warning
- [ ] No rompe importaciones existentes

**Notas técnicas:** Modificar `src/lib/normalizador/aliases.ts` y `src/lib/importar/ejecutar-importacion.ts`.

---

## V60-POS-028 — "Enviar al POS" desde pedidos

- Tipo: feature
- Módulo: pos
- Prioridad: low
- Estimación: 3
- Versión: v6.0
- Estado: todo
- Dependencias: V60-POS-020

**Descripción:** Agregar botón "Enviar al POS" en el detalle de un pedido que carga todos los items del pedido en el carrito POS para agilizar el cobro.

**Criterios de aceptación:**
- [ ] Botón "Enviar al POS" visible en detalle de pedido si módulo `facturador_pos` activo
- [ ] Al clickear, redirige a `/facturacion/pos` con los items del pedido pre-cargados
- [ ] Los items se cargan con las cantidades y precios del pedido
- [ ] Si hay un carrito en curso, pregunta si reemplazar o agregar
- [ ] Solo visible para pedidos en estado `confirmado`

**Notas técnicas:** Usar query params o localStorage para pasar los items del pedido al POS.

---

## V60-POS-029 — Tests unitarios y de integración

- Tipo: test
- Módulo: pos
- Prioridad: high
- Estimación: 8
- Versión: v6.0
- Estado: todo
- Dependencias: V60-POS-006, V60-POS-007, V60-POS-017, V60-POS-018

**Descripción:** Suite completa de tests unitarios para EAN-13 y parseBarcode, y tests de integración para las APIs de código de barras y emisión POS.

**Criterios de aceptación:**
- [ ] Tests unitarios EAN-13: check digit, validación, generación, formateo
- [ ] Tests unitarios parseBarcode: balanza, EAN normal, SKU, vacíos, inválidos
- [ ] Tests integración: asignar código, duplicado (409), generar interno
- [ ] Tests integración: buscar por barcode normal, por PLU, 404
- [ ] Tests integración: emitir ticket con items decimales
- [ ] Tests integración: aislamiento entre tenants
- [ ] Cobertura > 90% de lógica core

**Notas técnicas:** Archivos `src/test/ean13.test.ts`, `src/test/barcode-parser.test.ts`, `src/test/pos-integration.test.ts`. Usar Vitest.

---

## Roadmap de implementación — Bloque F

| Fase | Ticket | Descripción | Pts |
|---|---|---|---|
| 1 | V60-POS-001 | Migración: columnas codigo_barras, plu, es_pesable | 3 |
| 1 | V60-POS-002 | Migración: cantidad INTEGER → NUMERIC(12,3) | 5 |
| 1 | V60-POS-003 | Migración: flag facturador_pos en modulo_config | 3 |
| 1 | V60-POS-004 | Actualizar registrar_movimiento para NUMERIC | 2 |
| 1 | V60-POS-005 | Regenerar tipos TypeScript | 1 |
| 1 | V60-POS-006 | Librería EAN-13 (generar, validar, formatear) | 3 |
| 1 | V60-POS-007 | Parser de código escaneado (parseBarcode) | 3 |
| 1 | **Subtotal Fase 1** | | **20** |
| 2 | V60-POS-008 | API: asignar código de barras | 3 |
| 2 | V60-POS-009 | API: generar EAN-13 interno | 3 |
| 2 | V60-POS-010 | Extender PATCH producto con campos barcode | 2 |
| 2 | V60-POS-011 | UI: sección "Códigos y escaneo" en producto | 5 |
| 2 | V60-POS-012 | Extender búsqueda por código de barras | 2 |
| 2 | **Subtotal Fase 2** | | **15** |
| 3 | V60-POS-013 | Impresión de etiquetas individual | 8 |
| 3 | V60-POS-014 | Impresión masiva de etiquetas (lote) | 5 |
| 3 | **Subtotal Fase 3** | | **13** |
| 4 | V60-POS-015 | Migración: tipo ticket + metodo_pago | 3 |
| 4 | V60-POS-016 | Componente `<BarcodeInput />` | 5 |
| 4 | V60-POS-017 | API: búsqueda por código de barras | 3 |
| 4 | V60-POS-018 | Extender API emisión (ticket, pago, decimal) | 5 |
| 4 | **Subtotal Fase 4** | | **16** |
| 5 | V60-POS-019 | POS: layout, barra superior y zona escaneo | 8 |
| 5 | V60-POS-020 | POS: carrito de items y totales | 8 |
| 5 | V60-POS-021 | Modal de cobro | 8 |
| 5 | V60-POS-022 | Impresión de ticket térmico | 5 |
| 5 | **Subtotal Fase 5** | | **29** |
| 6 | V60-POS-023 | Atajos de teclado y ergonomía | 3 |
| 6 | V60-POS-024 | Manejo de casos borde | 5 |
| 6 | V60-POS-025 | Persistencia del carrito en localStorage | 2 |
| 6 | V60-POS-026 | Configuración POS en /configuracion | 3 |
| 6 | **Subtotal Fase 6** | | **13** |
| 7 | V60-POS-027 | Importador: columna código de barras | 2 |
| 7 | V60-POS-028 | "Enviar al POS" desde pedidos | 3 |
| 7 | V60-POS-029 | Tests unitarios y de integración | 8 |
| 7 | **Subtotal Fase 7** | | **13** |
| | **TOTAL BLOQUE F** | **29 tickets** | **119 pts** |

---

## Grafo de dependencias

```text
V60-POS-001 (producto barcode)
  ├── V60-POS-002 (cantidad decimal)
  │     ├── V60-POS-004 (registrar_movimiento NUMERIC)
  │     └── V60-POS-015 (tipo ticket + metodo_pago)
  └── V60-POS-003 (flag facturador_pos)

V60-POS-001 + V60-POS-002 + V60-POS-003 + V60-POS-004
  └── V60-POS-005 (regenerar tipos)
        ├── V60-POS-006 (librería EAN-13)
        │     ├── V60-POS-007 (parser barcode)
        │     │     └── V60-POS-017 (API buscar por barcode)
        │     ├── V60-POS-008 (API asignar código)
        │     └── V60-POS-009 (API generar código)
        ├── V60-POS-010 (PATCH producto + barcode)
        ├── V60-POS-012 (búsqueda por barcode)
        ├── V60-POS-016 (BarcodeInput component)
        └── V60-POS-027 (importador barcode)

V60-POS-008 + V60-POS-009 + V60-POS-010
  └── V60-POS-011 (UI códigos en producto)
        └── V60-POS-013 (etiquetas individual)
              └── V60-POS-014 (etiquetas lote)

V60-POS-015 + V60-POS-005
  └── V60-POS-018 (API emisión extendida)

V60-POS-016 + V60-POS-017 + V60-POS-018
  └── V60-POS-019 (POS layout)
        ├── V60-POS-020 (POS carrito)
        │     ├── V60-POS-021 (modal cobro)
        │     │     └── V60-POS-022 (ticket térmico)
        │     ├── V60-POS-023 (atajos teclado)
        │     ├── V60-POS-024 (casos borde)
        │     ├── V60-POS-025 (localStorage)
        │     └── V60-POS-028 (enviar desde pedidos)
        └── V60-POS-026 (configuración POS)

V60-POS-006 + V60-POS-007 + V60-POS-017 + V60-POS-018
  └── V60-POS-029 (tests)
```

---

## Orden de implementación recomendado

**Sprint 1 (Fase 1 — Fundacional):** POS-001 → POS-002 → POS-003 → POS-004 → POS-005 → POS-006 → POS-007

**Sprint 2 (Fase 2 — Productos):** POS-008 → POS-009 → POS-010 → POS-011 → POS-012

**Sprint 3 (Fase 3 — Etiquetas):** POS-013 → POS-014

**Sprint 4 (Fase 4 — Base POS):** POS-015 → POS-016 → POS-017 → POS-018

**Sprint 5 (Fase 5a — UI POS core):** POS-019 → POS-020 → POS-021

**Sprint 6 (Fase 5b — Impresión + Fase 6):** POS-022 → POS-023 → POS-024 → POS-025 → POS-026

**Sprint 7 (Fase 7 — Integraciones + Tests):** POS-027 → POS-028 → POS-029
