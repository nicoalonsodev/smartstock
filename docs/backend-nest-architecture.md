# SmartStock — Backend NestJS (arquitectura completa)

## Objetivo

Diseñar un backend NestJS escalable, testeable y multi-tenant para soportar el dominio actual de SmartStock (stock, importaciones, facturación, pedidos, IA y ARCA), manteniendo separación clara entre reglas de negocio, infraestructura y contratos de API.

---

## Principios de diseño

- Arquitectura por módulos de negocio, no por capas técnicas globales.
- `Controller -> UseCase -> Repository -> Database`.
- Reglas de negocio en `application/domain`, nunca en controller.
- Multi-tenant obligatorio en todos los repositorios y casos de uso.
- Operaciones críticas dentro de transacciones.
- Eventos de dominio para desacoplar procesos asíncronos.

---

## Estructura de carpetas sugerida

```text
src/
  app.module.ts
  main.ts
  modules/
    auth/
    tenancy/
    users/
    products/
    inventory/
    imports/
    pricing/
    customers/
    invoicing/
    orders/
    arca/
    shared/
      application/
      domain/
      infrastructure/
      api/
```

## Estructura interna por módulo

```text
modules/products/
  domain/
    entities/
    value-objects/
    services/
  application/
    use-cases/
    ports/
    dto/
  infrastructure/
    persistence/
      prisma/
      mappers/
    events/
  api/
    controllers/
    requests/
    responses/
```

---

## Módulos backend

## `auth`
- JWT access token, refresh token, roles.
- Guards y decorators (`@CurrentUser`, `@Roles`).

## `tenancy`
- Resolución de `tenant_id` desde token/header/subdominio.
- Tenant context request-scoped.
- Validación de aislamiento.

## `products`
- Catálogo de productos.
- Código interno y código(s) de barra.
- Búsqueda por nombre/código/barcode.

## `inventory`
- Movimientos atómicos.
- Stock disponible/comprometido.
- Locks y control de concurrencia.

## `imports`
- Pipeline de importación con normalización.
- Reglas de mapeo por proveedor.
- Upsert y reporte de errores.

## `pricing`
- Historial de precios.
- Sugerencia de márgenes.
- Cálculo y auditoría de cambios.

## `customers`
- CRUD de clientes fiscales.

## `invoicing`
- Emisión de comprobantes.
- Integración con stock y PDF.

## `orders`
- Ciclo de vida del pedido y conversión.

## `arca`
- WSAA, WSFE, cola, reintentos.
- Regeneración PDF con CAE y código de barras fiscal.

## `shared`
- Config, logger, interceptors, filtros, errores de dominio, utilidades comunes.

---

## Capas transversales

## Configuración
- `@nestjs/config` con schema validado (zod/joi).
- Variables por entorno (`dev`, `staging`, `prod`).

## Observabilidad
- Logger estructurado (`pino` recomendado).
- Correlation ID por request.
- Métricas (latencia, errores, throughput).
- Health checks (`@nestjs/terminus`).

## Seguridad
- Rate limit por IP y por tenant.
- Validación de DTO global.
- Sanitización de input.
- Política estricta de secretos.

## Errores
- Errores de dominio tipados (`DomainError`).
- Exception filter global.
- Formato uniforme de error API.

---

## Persistencia (PostgreSQL)

- ORM recomendado: Prisma o TypeORM (priorizar el que el equipo domine).
- Migraciones obligatorias versionadas.
- Índices por patrón real de consulta.
- Constraints de negocio en DB y en capa aplicación.
- Transacciones explícitas en casos críticos.

---

## Estrategia de integración con frontend actual

## Opción A (progresiva recomendada)
- Mantener Next.js como frontend.
- Migrar APIs por módulos al backend NestJS.
- Next actúa como BFF liviano/proxy.

## Opción B (corte directo)
- Apagar rutas API de Next.
- Todo pasa por NestJS de una vez.
- Más simple conceptualmente, más riesgoso operativamente.

---

## Checklist de calidad por módulo

- Casos de uso unit testeados.
- Repositorios con pruebas de integración.
- Contratos API con OpenAPI.
- Errores estandarizados.
- Métricas y logs mínimos.
- Cobertura de flujos de concurrencia cuando aplique.
