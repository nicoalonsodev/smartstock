---
estado: 🟡 En progreso
version: v6.0
ultima_actualizacion: 2026-04-16
---

# SmartStock — Contexto activo

## Qué estamos construyendo ahora

**Versión v6.0 — Códigos de barra + POS con escáner**

Este bloque incorpora dos capacidades complementarias que conforman un facturador profesional con escáner láser:

1. **Gestión de códigos de barra en productos** — Cada producto puede tener código de barras (EAN-13), PLU para balanzas, y ser marcado como pesable. Incluye generación de códigos internos, validación, búsqueda por código e impresión de etiquetas.

2. **Terminal POS con escáner** — Pantalla tipo caja registradora optimizada para escaneo rápido con pistola láser. El operador escanea, se acumulan items, y al cobrar se emite ticket/factura reutilizando el motor de facturación existente.

3. **Módulo `facturador_pos`** — Nuevo feature flag en `modulo_config`, controlado como el resto de módulos, activable por plan.

**Criterio de cierre:** Un operador abre el POS, escanea 5 productos (incluyendo uno pesable con balanza), cobra en efectivo con vuelto, y se imprime un ticket térmico. El stock se descuenta correctamente.

---

## Próximos 3 tickets a trabajar

Bloque F (v6.0 POS) planificado. Los primeros tickets son **Fase 1 — Fundacional**:

1. **V60-POS-001 — Migración: columnas codigo_barras, plu y es_pesable en producto**
   Nuevas columnas en `producto` con índices UNIQUE parciales y CHECK constraints.

2. **V60-POS-002 — Migración: cantidad INTEGER → NUMERIC(12,3)**
   Cambio de tipo en movimiento, comprobante_item, pedido_item y producto.

3. **V60-POS-003 — Migración: flag facturador_pos en modulo_config**
   Nuevo módulo con constraint de dependencia y actualización de `activar_plan`.

---

## Decisiones tomadas para v6.0

| Decisión | Resolución | Contexto |
|---|---|---|
| Integración del escáner | Teclado HID — sin drivers ni permisos | Cubre 99% de escáneres argentinos (Honeywell, Zebra, genéricos) |
| Variante de código de balanza | Peso embebido (no precio) | Estándar en almacenes/verdulerías argentinas; precio se mantiene en el sistema |
| Tres identificadores por producto | SKU + código_barras + PLU | Ortogonales: un producto puede tener cualquier combinación |
| POS reutiliza motor de facturación | Llama al mismo `POST /api/facturacion/emitir` | Un solo motor fiscal, el POS es solo otra UI |
| Cantidad decimal vs campo peso | Migrar cantidad a NUMERIC(12,3) | Más limpio que un campo `peso` separado; una sola migración |
| Tipo de comprobante ticket | Nuevo valor en el ENUM | Numeración propia, PDF distinto (térmico), no fiscal |
| Impresión térmica | `window.print()` + CSS | Cubre 80% de los casos; qz-tray como opción futura documentada |

## Decisiones pendientes de tomar

| Decisión | Opciones | Contexto |
|---|---|---|
| Secuencial de EAN-13 interno | MAX sobre códigos existentes vs contador dedicado | MAX es más simple, contador es más robusto bajo concurrencia |
| Múltiples cajas en v6.0 | Implementar desde el inicio vs dejar para v6.1 | Diseñar la columna `caja_id` pero no implementar UI multi-caja todavía |
| PDF del ticket térmico | Solo frontend vs frontend + backend | Recomendación: ambos (frontend para impresión inmediata, backend PDF A4 para archivo) |

---

## Bloqueos actuales

| Bloqueo | Estado | Acción requerida |
|---|---|---|
| Migraciones v6.0 pendientes | Pendiente | Ejecutar 023-026 en Supabase antes de regenerar tipos |
| Dependencia `bwip-js` no instalada | Pendiente | Instalar para renderizado de códigos de barra en etiquetas |

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
| Fase 5 — Analizador y rentabilidad | `analizador.md` | Completada |
| Fase 6 — Tickets bloques A-E | `TICKETS.md` | Completada (104 tickets) |
| Fase 7 — POS con escáner | `PLAN-BLOQUE-F.md`, `TICKETS.md` (bloque F) | Planificación completada (29 tickets) |

---

## Última actualización

**Fecha:** 2026-04-16
**Último ticket completado:** V50-ANAL-025 — Alertas del analizador en dashboard + UI de cuenta corriente
**Bloque E (v5.0 Analizador):** Completado — 25/25 tickets
**Bloque F (v6.0 POS):** Planificado — 0/29 tickets (119 pts)
**Siguiente paso:** V60-POS-001 — Migración: columnas codigo_barras, plu y es_pesable en producto
**Bloques pendientes de implementar:** v4.0 ARCA (10 tickets), v6.0 POS (29 tickets)
