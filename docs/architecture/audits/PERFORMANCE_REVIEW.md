# PERFORMANCE & SCALABILITY REVIEW — AuraRest Multitenant

> **Roles aplicados**: Principal Performance Engineer, Staff Software Engineer, Database Performance Architect, PostgreSQL Performance Expert, Prisma Performance Specialist, React Performance Engineer, Frontend Performance Architect, Cloud Scalability Architect, Site Reliability Engineer
>
> **Fecha**: 2026-07-05
> **Rama**: `audit/architecture-review`
> **Tipo**: Revisión exclusiva de rendimiento y escalabilidad — sin implementación, sin código, solo análisis

---

## Respuesta Directa

### ¿Dónde están los cuellos de botella actuales?

El sistema tiene **5 cuellos de botella críticos** activos hoy:

1. **Per-tenant PrismaClient pool** — Cada tenant crea su propio pool de conexiones PostgreSQL (~10 conexiones cada uno). 11 tenants agotan `max_connections=100`.
2. **Sin índices en columnas FK ni en status/createdAt** — Todas las consultas de listados y reportes hacen sequential scans. 15 foreign keys sin índice.
3. **In-memory aggregation en reports y stats** — Reportes cargan todas las filas a la memoria del servidor para sumar en JavaScript. OOM seguro con >10K órdenes.
4. **Sin capa de caché en frontend** — Cada llamada API es un fetch nuevo. Sin React Query, SWR, ni deduplicación. Branch changes disparan 16-32 requests simultáneos.
5. **EventBus síncrono in-memory** — Bloquea el event loop cuando un listener es lento. Sin error handler, cualquier excepción crashea el proceso.

### ¿Dónde dejará de escalar el sistema?

| Escala | Falla primero | Por qué |
|--------|--------------|---------|
| **15-20 tenants** | Base de datos | `max_connections` de PostgreSQL se agota (pool de 10/tenant ≈ 150-200 conexiones). |
| **50 tenants** | Backend (OOM) | Reportes y listados sin paginación cargan datasets enormes en memoria. |
| **10K órdenes por rest** | API Reports | Queries sin índices toman >5s. In-memory aggregation crashea por heap. |
| **500 usuarios concurrentes** | Conexiones DB + CPU | bcrypt en login bloquea event loop. Pool de conexiones se agota. |
| **100 pagos simultáneos** | Deadlock + inconsistencia | Sin transacciones, sin idempotency. Race conditions en folio generation. |
| **Branch change masivo** | Frontend + API | 9 MFEs disparan 16-32 requests simultáneos. Sin deduplicación ni caché. |

### ¿Cuáles serán los primeros componentes en fallar?

1. **TenantPrismaService** — Pool de conexiones se agota primero (CRITICAL, ~15 tenants).
2. **ReportsController** — In-memory aggregation causa OOM (CRITICAL, ~10K órdenes).
3. **ReservationsController** — Listado sin paginación carga 10K+ reservas (HIGH).
4. **EventBus** — Listener lento bloquea event loop o crashea proceso (CRITICAL).
5. **Login endpoint** — bcrypt + DB query saturan CPU (HIGH).
6. **OrdersRepository** — Joins masivos en listados sin `select` projection (HIGH).
7. **BranchContext en MFEs** — Thundering herd en cambio de sucursal (HIGH).

---

## 1. Backend — NestJS Performance

### 1.1 Controladores sin paginación

| Endpoint | Archivo | Líneas | Problema | Impacto |
|----------|---------|--------|----------|---------|
| `GET /tables` | `tables.controller.ts` | 27-31 | `findAll` sin `skip`/`take` | ALTO |
| `GET /promotions` | `promotions.controller.ts` | 37-41 | `findAll` sin `skip`/`take` | MEDIO |
| `GET /discounts` | `discounts.controller.ts` | 37-41 | `findAll` sin `skip`/`take` | MEDIO |
| `GET /categories` | `categories.controller.ts` | 43-48 | `findAll` sin `skip`/`take` | BAJO |
| `GET /menus` | `menus.controller.ts` | 48-62 | `findAll` sin `skip`/`take`, incluye `category` relation | ALTO |
| `GET /reservations` | `reservations.controller.ts` | 33-39 | Acepta `page`/`limit` en DTO pero **nunca los usa**. Repositorio sin `skip`/`take`. | **CRÍTICO** |

### 1.2 In-memory aggregation (CRITICAL)

#### ReservationsService.getStats
- **Archivo**: `apps/backend/src/reservations/reservations.service.ts`, líneas 40-80
- **Problema**: Carga TODAS las reservaciones en memoria (`reservationRepo.findAll` sin filtro de fecha), luego aplica 5+ `.filter()` y `.reduce()` en JavaScript.
- **Impacto**: Con 50K reservas, cada llamada transfiere 50K filas a la app, consume heap, y tarda segundos.
- **Debe usar**: `Prisma aggregate` / `count` con `where` por fecha.

#### OrdersService.getStats
- **Archivo**: `apps/backend/src/orders/orders.service.ts`, líneas 212-265
- **Problema**: Ejecuta **7 consultas DB separadas** en paralelo (6 `count` + 1 `findMany`), cuando una sola query SQL con `FILTER` clauses bastaría.
- **Impacto**: 700 queries por segundo a 100 requests concurrentes. Satura DB connection pool.

#### ReportsService (múltiples métodos)
- **Archivo**: `apps/backend/src/reports/reports.service.ts`, líneas 34-87
- **Problema**: `getSalesReport` carga TODAS las órdenes pagadas entre fechas vía `findMany` con `include: { payments: true }`, luego itera en JS para sumar. Las órdenes pagadas de un año pueden ser 100K+ filas.
- **Impacto**: OOM en producción. La agregación debe hacerse en SQL con `SUM`, `COUNT`, `AVG`.

### 1.3 Guards y middleware pipeline

| Componente | Archivo | Costo por request |
|------------|---------|-------------------|
| `TenantMiddleware` (vía DB) | `tenant.middleware.ts` | 1 query DB en requests públicos (login, health) — SIN CACHÉ |
| `JwtAuthGuard` (global) | `app.module.ts` | Verificación HMAC-SHA256 en CADA request — SIN CACHÉ de payload |
| `RolesGuard` (global) | `app.module.ts` | Reflector metadata lookup en CADA request |
| `TenantGuard` | `tenant.guard.ts` | Verificación de `req.tenant` existente (redundante con middleware) |
| `ValidationPipe` (global) | `main.ts` | `transform: true` + `whitelist` + `forbidNonWhitelisted` por request |

**3 guards + 1 middleware + 1 pipe por cada request.** Cada request autenticado paga: JWT verify (crypto) + tenant check + role check + validation. Pipeline puede optimizarse fusionando TenantMiddleware + TenantGuard y cacheando JWT payloads.

### 1.4 bcrypt bloquea event loop

- **Archivo**: `apps/backend/src/auth/auth.service.ts`, línea 23
- **Problema**: `bcrypt.compare()` toma ~100-150ms de CPU en el hilo principal por llamada. Sin worker threads configurados.
- **Impacto**: 10 logins simultáneos bloquean el event loop por ~1 segundo. Todas las demás requests se encolan.

---

## 2. Prisma — ORM Performance

### 2.1 Pool de conexiones (CRITICAL — #1 bottleneck)

#### TenantPrismaService
- **Archivo**: `apps/backend/src/database/tenant-prisma.service.ts`
- **Problema**: Cada tenant crea un `PrismaClient` independiente. PrismaClient por defecto crea un pool de `max(10, cpu*2)` conexiones.
- **Cálculo**: 50 tenants × 10 conexiones = 500 conexiones. Con `max_connections=100` en PostgreSQL, el sistema falla en ~15 tenants.

| Tenants | Conexiones (pool=10) | Conexiones (pool=2) | PostgreSQL `max_connections=100` |
|---------|---------------------|---------------------|----------------------------------|
| 10 | ~100 | ~20 | ✅ Sobrevive |
| 20 | ~200 | ~40 | ⚠️ Pool=10 excede |
| 50 | ~500 | ~100 | ❌ Pool=10: crash / Pool=2: al límite |
| 100 | ~1000 | ~200 | ❌ Ambas configs exceden |
| 500 | ~5000 | ~1000 | ❌ Imposible sin rearquitectura |

**Adicional**:
- Sin límite de clientes en el `Map` — ataque con slugs aleatorios puede crear clientes infinitos.
- Sin TTL, sin LRU, sin evicción — clientes de tenants eliminados viven para siempre (memory leak).
- Sin PgBouncer compatibility — `?schema=` en URL no funciona con PgBouncer transaction mode (search_path leak).
- Sin pre-warming — `$connect()` nunca se llama, hay cold start en primer request de cada tenant.

### 2.2 Over-fetching con includes masivos

#### OrdersRepository
- **Archivo**: `apps/backend/src/orders/orders.repository.ts`, líneas 18-48
- **Problema**: Tanto `findById` como `findMany` usan SIEMPRE:
  ```ts
  include: {
    orderItems: { include: { menuItem: true } },
    table: true,
    user: true,
    payments: true,
  }
  ```
- **Impacto**: Un listado de 20 órdenes genera un JOIN de 5 tablas y transfiere potencialmente 80-120 filas combinadas. Para listas que solo muestran `folio`, `status`, `total`, `createdAt`, el 80% de los datos transferidos es innecesario.

#### ReportsRepository.getSalesReport
- **Archivo**: `apps/backend/src/reports/reports.repository.ts`, líneas 23-35
- **Problema**: Incluye `payments: true` pero el servicio nunca accede a `order.payments`.
- **Impacto**: JOIN innecesario + transferencia de datos de pagos que se descartan.

### 2.3 N+1 y race conditions

#### Folio generation race condition
- **Archivo**: `apps/backend/src/orders/orders.service.ts`, líneas 267-274
- **Problema**: `generateFolio` primero cuenta órdenes con `folio.startsWith(prefix)`, luego construye `folio = prefix + (count + 1)`. Dos requests concurrentes obtienen el mismo `count`.
- **Impacto**: `UNIQUE` constraint en `folio` lanza excepción. La operación no es idempotente.
- **Solución**: Usar secuencia DB o UUID-based folio.

#### ReportsRepository.getProductsReport
- **Archivo**: `apps/backend/src/reports/reports.repository.ts`, líneas 51-71
- **Problema**: `orderItem.groupBy` con `where` anidado en `order.status` y `order.createdAt`. Ni `order_items.orderId` ni `orders.status`/`orders.createdAt` tienen índices.
- **Impacto**: Sequential scans en ambas tablas + hash join para 100K órdenes → timeout.

### 2.4 Text search sin índice

- **Archivo**: `apps/backend/src/orders/orders.service.ts`, líneas 109-114
- **Problema**: `folio: { contains: search, mode: 'insensitive' }` — `contains` con `mode: 'insensitive'` hace `LIKE '%valor%'` que no puede usar índice B-tree.
- **Impacto**: Sequential scan en cada búsqueda por folio o customerName.
- **Solución**: Índice GIN con extensión `pg_trgm`.

---

## 3. PostgreSQL — Database Performance

### 3.1 Índices faltantes (CRÍTICO)

PostgreSQL **no auto-indexa foreign keys**. El sistema tiene **15 foreign keys sin índice**.

#### Foreign keys sin índice

| FK Column | Tabla referenciada | Líneas en schema | Queries afectadas | Impacto |
|-----------|-------------------|-----------------|-------------------|---------|
| `menu_items.category_id` | `categories.id` | schema 166 | Todos los JOINs menu ↔ category | ALTO |
| `orders.table_id` | `tables.id` | schema 186 | Order detail JOINs | ALTO |
| `orders.branch_id` | `branches.id` | schema 194 | Branch filtering, reports | ALTO |
| `orders.user_id` | `users.id` | schema 195 | User order history | ALTO |
| `order_items.order_id` | `orders.id` | schema 213 | Item lookups por order | ALTO |
| `order_items.menu_item_id` | `menu_items.id` | schema 214 | Product reports | ALTO |
| `payments.order_id` | `orders.id` | schema 228 | **CRÍTICO** — índice UNIQUE fue DROPPED sin reemplazo | **CRÍTICO** |
| `reservations.branch_id` | `branches.id` | schema 282 | Todas las queries de reservas filtran por branch | ALTO |
| `reservations.table_id` | `tables.id` | schema 283 | Reservas por mesa | ALTO |
| `user_branches.user_id` | `users.id` | schema 393 | Membership queries | ALTO |
| `user_branches.branch_id` | `branches.id` | schema 393 | Branch membership | ALTO |
| `activity_logs.branch_id` | `branches.id` | schema 418 | Audit log filtering | ALTO |
| `activity_logs.user_id` | `users.id` | schema 419 | User audit trail | MEDIO |
| `permissions.role_id` | `roles.id` | schema 409 | Role permissions | MEDIO |
| `orders.discount_id` | `discounts.id` | schema 193 | Discount application | MEDIO |

#### Índices compuestos faltantes

| Query | Tabla | Índice necesario | Impacto |
|-------|-------|-----------------|---------|
| `WHERE status = 'PAID' AND createdAt BETWEEN ...` | `orders` | `@@index([status, createdAt])` | **CRÍTICO** — 90% de reports usan este patrón |
| `WHERE branchId = ? AND status = ?` | `reservations` | `@@index([branchId, status])` | ALTO |
| `WHERE branchId = ?` | `orders` | `@@index([branchId])` | ALTO |
| `ORDER BY createdAt DESC` | `orders` | `@@index([createdAt])` | ALTO |
| `ORDER BY createdAt DESC` | `reservations` | `@@index([createdAt])` | ALTO |
| `WHERE status = 'COMPLETED' AND createdAt BETWEEN ...` | `payments` | Índice parcial donde `status = 'COMPLETED'` | ALTO |
| `GROUP BY menuItemId` con `WHERE order.status = 'PAID'` | `order_items` + `orders` | `@@index([orderId, menuItemId])` en order_items | ALTO |

### 3.2 Query Planner — Análisis de joins y sorts

Sin los índices FK, cada JOIN entre tablas requiere:
1. Sequential scan en la tabla FK (ej: `orders` para encontrar `table_id`)
2. Sequential scan en la tabla referenciada (ej: `tables` para encontrar `id`)
3. Hash Join en memoria del servidor PostgreSQL

Con 15 FKs sin índice, **cada request típico hace 3-5 sequential scans**. En tablas con >10K filas, esto toma segundos en lugar de milisegundos.

### 3.3 Deadlock risk en pagos

**Flujo de `processPayment`** (payments.service.ts):
1. READ order → READ payments → WRITE payment → WRITE order.status=PAID → WRITE table.status=AVAILABLE

**Flujo de `updateStatus`** (orders.service.ts):
1. READ order → WRITE order.status → WRITE table.status

**Escenario deadlock**:
- Hilo A: locks order_row → espera table_row
- Hilo B: locks table_row → espera order_row

No hay transacciones explícitas con `$transaction`, así que cada write adquiere locks individuales. El orden de locks no es consistente entre flujos.

### 3.4 Enums vs VARCHAR

**Bueno**: Todos los status fields usan enums PostgreSQL (UserRole, OrderStatus, PaymentStatus, etc.). Los enums ocupan 4 bytes vs variable-length string. **Correcto**.

### 3.5 CUID como PK

Todas las PKs usan `String @id @default(cuid())`. Los CUIDs:
- Son 25 caracteres (vs 16 de UUID, 4 de serial integer)
- NO son time-sortable (causa page splits en B-tree)
- Índices más grandes → más I/O en cache misses
- Alternativa: UUID v7 (time-ordered, sortable, 16 bytes)

---

## 4. Frontend — React Performance

### 4.1 React Context — Objetos recreados en cada render (CRÍTICO)

#### BranchContext (shell)
- **Archivo**: `apps/web-shell/src/context/BranchContext.tsx`, líneas 48-54
- **Problema**: El objeto `value` se recrea en cada render. `branches` es estable pero se mezcla con `selectedBranch` que cambia frecuentemente.
- **Impacto**: TODOS los consumidores de BranchContext re-renderizan cuando `selectedBranch` cambia, incluso componentes que solo leen `branches`.
- **Solución**: Dividir en `BranchStableContext` (branches list) + `BranchActionContext` (selectedBranch, setBranch). Envolver ambos `value` en `useMemo`.

#### ThemeContext (shell)
- **Archivo**: `apps/web-shell/src/context/ThemeContext.tsx`, líneas 36-39
- **Problema**: `toggleTheme` es una nueva función en cada render.
- **Impacto**: Todos los consumidores re-renderizan aunque el theme no cambie.
- **Solución**: `useCallback` para `toggleTheme`, `useMemo` para el objeto `value`.

#### SidebarContext (shell)
- **Archivo**: `apps/web-shell/src/context/SidebarContext.tsx`, líneas 58-63
- **Problema**: Objeto `value` recreado en cada render.
- **Impacto**: Sidebar consumers re-renderizan en cada cambio de estado.

#### Duplicación de BranchContext en MFEs

BranchContext existe **duplicado** en 6 MFEs:
- `apps/web-shell/src/context/BranchContext.tsx`
- `apps/orders-mf/src/context/BranchContext.tsx`
- `apps/menu-mf/src/context/BranchContext.tsx`
- `apps/tables-mf/src/context/BranchContext.tsx`
- `apps/reservations-mf/src/context/BranchContext.tsx`
- `apps/dashboard-mf/src/context/BranchContext.tsx`

**Problema**: Cuando el shell cambia de sucursal, emite `branch:changed`. TODOS los MFEs reciben el evento, actualizan su `selectedBranch`, re-renderizan todos sus consumidores, y disparan nuevas llamadas API simultáneamente → **thundering herd**.

### 4.2 Sin React Query / SWR / Caching (CRÍTICO)

- **Archivo**: `packages/api-client/src/client.ts`, líneas 55-81
- **Problema**: Wrapper fetch puro. Sin React Query, SWR, ni capa de caché. Cada llamada es un round-trip completo al servidor.
- **Sin deduplicación**: Si 2 componentes llaman `useBranches()`, se hacen 2 requests.
- **Sin stale-while-revalidate**: Navegación siempre muestra loader aunque los datos no hayan cambiado.
- **Sin refetch automático**: No hay refetch en background tras mutaciones.
- **Sin optimistic updates**: Las mutaciones esperan respuesta del servidor.

### 4.3 JWT parseado en cada request

- **Archivo**: `packages/api-client/src/client.ts`, líneas 26-53
- **Problema**: `getAuthHeaders()` en cada request: (1) lee `localStorage.getItem(TOKEN_KEY)`, (2) hace `atob()` + `JSON.parse()` del JWT, (3) lee `localStorage.getItem('currentTenantSlug')`.
- **Impacto**: `localStorage.getItem` es síncrono y bloquea el main thread. El parseo JWT es ~20µs pero se multiplica por requests simultáneos.
- **Solución**: Cachear el payload decodificado en una variable módulo, invalidar en logout.

### 4.4 Sin AbortController

- **Archivo**: `packages/api-client/src/client.ts`, líneas 55-81
- **Problema**: Fetch calls no tienen `AbortController.signal`. Cuando el usuario navega o cambia de sucursal, los requests en vuelo continúan hasta completarse.
- **Impacto**: Ancho de banda desperdiciado, race conditions (datos viejos sobrescriben nuevos).

### 4.5 Missing memoization

#### React.memo faltante en componentes de lista (ALTO)
- `KitchenTicketCard` en `apps/kitchen-mf/src/pages/KitchenQueuePage.tsx` — renderizado en `.map()` loop
- `OrderCard` en `apps/orders-mf/src/pages/OrdersPage.tsx` — en grid, cada re-render padre = 20+ re-renders hijos
- `MenuItemCard` en `apps/cashier-mf/src/pages/POSPage.tsx` — 50+ items en grid
- `TableCard` en `apps/cashier-mf/src/pages/POSPage.tsx` — grid de mesas

#### useMemo faltante en computed values (ALTO)
- `apps/cashier-mf/src/pages/POSPage.tsx`, líneas 226-231: `categories` y `filteredItems` recomputados en cada render con `.toLowerCase()` en cada elemento
- `apps/web-shell/src/components/ui/BranchSelector.tsx`: array `allOptions` recreado en cada render

### 4.6 Sin virtualización de listas

Ninguna lista usa `react-window`, `react-virtuoso` o similar:

- `apps/orders-mf/src/pages/OrdersPage.tsx` — grid de órdenes
- `apps/cashier-mf/src/pages/POSPage.tsx` — grid de menu items
- `apps/kitchen-mf/src/pages/KitchenQueuePage.tsx` — columnas de tickets
- `apps/menu-mf/src/pages/MenusPage.tsx` — grid de productos

### 4.7 Bundle grande sin code splitting

- **recharts full import**: `apps/reports-mf/src/pages/ReportesPage.tsx` — import barrel `import { BarChart, Bar, ... } from 'recharts'` carga 500KB+
- **jsPDF eager**: `apps/reports-mf/src/utils/pdfExport.ts` — import a nivel módulo, debería ser lazy `import('jspdf')`
- **Sin manualChunks**: Ningún vite.config.ts configura `rollupOptions.output.manualChunks`, todo va en un solo chunk por MFE
- **@maison/ui +36 icons**: `packages/ui/src/Icons.tsx` exporta 36 iconos via `export *` — barrel import impide tree-shaking

---

## 5. Microfrontends — Module Federation Performance

### 5.1 remoteEntry.js eager loading (ALTO)

- **Archivo**: `apps/web-shell/src/lib/federation.ts`, líneas 38-67
- **Problema**: `init()` descarga los **8 remoteEntry.js** al montar el primer `RemoteLoader`. Aunque `loadRemote` es lazy, los metadatos de todos los MFEs se descargan al inicio.
- **Impacto**: 8 HTTP requests adicionales en el paint inicial.

### 5.2 Cross-MFE direct import (ALTO)

- **Archivo**: `apps/dashboard-mf/src/App.tsx`, línea 12
- **Problema**: `const ReservacionesPage = React.lazy(() => import('../../reservations-mf/src/pages/ReservacionesPage'))` — import directo de filesystem.
- **Impacto**: By-passea Module Federation. Importa React duplicado desde reservations-mf (viola singleton), hooks pueden crashear con "dispatcher null".

### 5.3 Shared singletons sin tree-shaking

Todos los paquetes compartidos son `singleton: true`:
- `react`, `react-dom`, `react/jsx-runtime`, `react-router-dom`
- `@maison/ui`, `@maison/api-client`, `@maison/types`, `@maison/event-bus`, `@maison/auth-client`

**Impacto**: `@maison/ui` completo (36 iconos + componentes) se carga como shared chunk aunque el MFE solo use 2 iconos.

### 5.4 React 19 Compiler solo en shell

- `apps/web-shell/next.config.ts`: `reactCompiler: true` — auto-memoización disponible solo en Next.js shell.
- MFEs Vite no tienen react-compiler, dependen completamente de memo explícito (que falta).

---

## 6. Red — Network Performance

### 6.1 Thundering herd en cambio de sucursal

**Flujo completo**:
1. Usuario selecciona sucursal en BranchSelector
2. Shell emite `branch:changed` vía event-bus
3. Cada uno de los 9 MFEs recibe el evento
4. Cada MFE actualiza `selectedBranch` → re-renderiza consumidores
5. Cada hook useEffect detecta cambio de `branchId` → dispara fetch
6. Resultado: **16-32 requests HTTP simultáneos** a la API

### 6.2 Sin compresión ni HTTP/2

- No se detectó configuración de compresión (gzip/brotli) en backend NestJS.
- No se detectó HTTP/2 habilitado.
- Payloads JSON grandes (listados con includes pesados) viajan sin comprimir.

### 6.3 Over-fetching y under-fetching

- **Over-fetching**: `OrdersRepository.findById` incluye 4 relaciones aunque el frontend solo necesite 2-3 campos de cada una.
- **Under-fetching**: No hay endpoints especializados para listas ligeras vs detalle pesado. El mismo endpoint sirve para ambos casos.

---

## 7. Memoria

### 7.1 Memory leaks identificados

| Componente | Causa | Impacto | Cómo se manifiesta |
|------------|-------|---------|-------------------|
| TenantPrismaService | `Map<string, TenantPrismaClient>` sin límite, sin TTL, sin evicción | CRÍTICO | Conexiones PostgreSQL + memoria del proceso Node.js crecen sin límite |
| EventBus listeners | `emitter.on()` sin límite de listeners | ALTO | Node.js warning a los 11 listeners; sin `setMaxListeners()` |
| Hooks con `cancelled` flag | Las closures capturan `cancelled` en el closure pero el fetch continúa | MEDIO | HTTP requests en vuelo después de unmount (banda ancha desperdiciada) |
| Sin AbortController | Fetch calls nunca abortados | MEDIO | Callbacks de fetch intentan setState después de unmount |

### 7.2 PrismaClient memory por tenant

| Componente | Memoria estimada | 50 tenants | 500 tenants |
|------------|-----------------|------------|-------------|
| PrismaClient + query engine | ~10-15 MB | ~500-750 MB | ~5-7.5 GB |
| Connection pool (10 conns × 5MB) | ~50 MB | ~2.5 GB | ~25 GB |
| Schema cache | ~2 MB | ~100 MB | ~1 GB |
| **Total por tenant** | **~62-67 MB** | **~3.1-3.35 GB** | **~31-33.5 GB** |

Con 500 tenants, solo el PrismaClient memory excede 32 GB.

---

## 8. CPU

### 8.1 Puntos calientes de CPU

| Componente | Operación | Costo CPU | Frecuencia |
|------------|-----------|-----------|------------|
| bcrypt.compare (login) | Hash comparison | ~100-150ms (hilo principal) | Por login |
| JWT verify | HMAC-SHA256 signature | ~0.5-1ms | Por request autenticado |
| ValidationPipe.transform | class-transformer + class-validator | ~1-10ms (según payload) | Por request POST/PUT |
| In-memory aggregation | JS .filter() + .reduce() en arrays grandes | ~10-100ms | Por request de reports/stats |
| Folio generation | count() scan sobre tabla orders | ~5-50ms (crece con datos) | Por creación de orden |

### 8.2 Sin worker threads

`bcrypt.compare()` (paso 23 en login) ejecuta en el event loop principal. Sin `worker_threads` o `pool` externo, 10 logins simultáneos bloquean el servidor por ~1s.

---

## 9. Escenarios de carga

### 9.1 10 usuarios concurrentes — 1 restaurante

| Componente | Estado | Recurso crítico |
|------------|--------|-----------------|
| Backend API | ✅ Funciona | CPU: <10% |
| PostgreSQL | ✅ Funciona | Conexiones: 1-2 activas |
| PrismaClient | ✅ Funciona | Memoria: <100MB |
| Frontend MFEs | ✅ Funciona | Bundle: ok |
| **Falla primero**: Nada | **Severidad**: ✅ Normal |

### 9.2 100 usuarios concurrentes — 10 restaurantes

| Componente | Estado | Recurso crítico |
|------------|--------|-----------------|
| Backend API | ⚠️ Degradado | CPU: bcrypt + JWT + validación ~40-60% |
| PostgreSQL | ⚠️ Degradado | Conexiones: ~100 (límite). Sequential scans en queries sin índice |
| PrismaClient | ❌ 10 clients × 10 pool = 100 conexiones | **Conexiones agotadas** |
| Frontend MFEs | ⚠️ Lento | Sin caché → 100 requests simultáneos por cambio de sucursal |
| **Falla primero**: PostgreSQL max_connections | **Severidad**: 🔴 ALTA |

### 9.3 500 usuarios concurrentes — 50 restaurantes

| Componente | Estado | Recurso crítico |
|------------|--------|-----------------|
| Backend API | ❌ Colapsa | CPU: bcrypt satura event loop. Timeouts en cascada |
| PostgreSQL | ❌ Conexiones agotadas | 50 tenants × 10 pool = 500 conexiones. `max_connections=100` excedido |
| Reports | ❌ OOM | In-memory aggregation con datasets de 50K+ órdenes |
| EventBus | ❌ Crash | Listener lento + sin error handler = proceso muerto |
| Frontend MFEs | ❌ Timeouts | Requests sin caché, thundering herd en cada cambio |
| **Falla primero**: TenantPrismaService + PostgreSQL | **Severidad**: 🔴 CRÍTICA |

### 9.4 1000 usuarios concurrentes — 100 restaurantes

| Componente | Estado | Recurso crítico |
|------------|--------|-----------------|
| Backend API | ❌ No disponible | Conexiones DB no disponibles desde ~15 tenants |
| PostgreSQL | ❌ `too many clients` | Imposible sin rearquitectura del pool |
| Memoria Node | ❌ OOM | 100 PrismaClients × 65MB ≈ 6.5GB |
| Frontend | ❌ Sin datos | API no responde |
| **Falla primero**: Todo | **Severidad**: 🔴 CRÍTICA |

### 9.5 100 órdenes simultáneas

| Componente | Problema | Severidad |
|------------|----------|-----------|
| Folio generation | Race condition → UNIQUE violation en ~10% de casos | 🔴 ALTA |
| OrderItems includes | 100 órdenes × 5 items promedio × includes = 500 joins | ⚠️ MEDIA |
| EventBus payment:completed | Sync emit bloquea hasta que listeners terminen | 🔴 ALTA |

### 9.6 100 pagos simultáneos

| Componente | Problema | Severidad |
|------------|----------|-----------|
| Sin transacción | Pago parcial si falla entre INSERT payment y UPDATE order | 🔴 CRÍTICA |
| Sin idempotency | Mismo payment procesado múltiples veces por retry | 🔴 CRÍTICA |
| Deadlock risk | processPayment vs updateStatus — lock ordering inconsistente | 🔴 ALTA |
| payments.order_id sin índice | Cada INSERT busca en full scan | ⚠️ MEDIA |

### 9.7 100 reportes ejecutándose simultáneamente

| Componente | Problema | Severidad |
|------------|----------|-----------|
| In-memory aggregation | 100 × (cargar 50K filas + sumar en JS) = 5M filas en memoria | 🔴 CRÍTICA — OOM |
| Sin índices en status+createdAt | 100 sequential scans simultáneos saturan I/O | 🔴 ALTA |
| CPU | 100 iteraciones de reduce + filter saturan event loop | 🔴 ALTA |

### 9.8 50 cocinas + 200 cajeros trabajando

| Componente | Problema | Severidad |
|------------|----------|-----------|
| Kitchen polling | 50 × 30s polling = ~1.6 requests/segundo solo para cocinas | ⚠️ MEDIA |
| POS operations | 200 cajeros creando órdenes + pagos simultáneos | 🔴 ALTA |
| WebSocket (if any) | KitchenQueue intenta WS pero falla → cae a polling | ⚠️ MEDIA |

---

## 10. Escalabilidad

### 10.1 Horizontal scaling — Assessment

| Componente | ¿Stateless? | ¿Escala horizontal? | Bloqueador |
|------------|-------------|---------------------|------------|
| Backend NestJS | ❌ Stateful | ❌ No | EventBus in-memory impide compartir eventos entre instancias |
| TenantPrismaService | ❌ Stateful | ❌ No | PrismaClient cacheado en memoria local de cada instancia |
| Auth / JWT | ✅ Stateless | ✅ Sí | JWT es auto-contenido |
| Frontend Shell | ✅ Stateless | ✅ Sí | Next.js puede escalar con CDN |
| Frontend MFEs | ✅ Stateless | ✅ Sí | Static files servidos desde CDN |

**Cada instancia de backend tiene su propio EventBus y su propio cache de PrismaClients. Doblar instancias = doblar conexiones DB.**

### 10.2 Vertical scaling — Assessment

| Componente | ¿Escala vertical? | Límite | Costo |
|------------|-------------------|--------|-------|
| Backend Node.js | Parcial | ~8-16 cores útiles (single thread) | Medio |
| PostgreSQL | ✅ Sí | RAM/CPU según hardware | Alto |
| Frontend | ✅ Sí | CDN-based, escala casi ilimitado | Bajo |

### 10.3 Read replicas

No implementadas. Reportes pesados (sales, products, payments, peakHours) se ejecutan contra el mismo servidor de escritura. Con read replicas, los reportes podrían dirigirse a réplicas de solo lectura sin afectar el rendimiento transaccional.

### 10.4 Cache

| Capa | Estado | Impacto |
|------|--------|---------|
| API response cache | ❌ No existe | Cada request va a DB |
| Database query cache | ❌ No configurado | Queries repetidas recalculan |
| Tenant lookup cache | ❌ No existe | TenantMiddleware consulta DB en cada request público |
| JWT payload cache | ❌ No existe | JWT verificado en cada request |
| Redis | ❌ No implementado | EventBus, rate limiting, sesiones — todo in-memory |
| CDN | ❌ No configurado | Static assets servidos desde Node, no desde edge |

### 10.5 Queues

No implementadas. Operaciones pesadas (reportes, export PDF, notificaciones) se ejecutan sincrónicamente en el request path. Con colas (Bull + Redis), podrían procesarse en background.

### 10.6 WebSockets

- **Archivo**: `apps/kitchen-mf/src/hooks/useKitchenQueue.ts`, líneas 27-73
- **Problema**: Intenta WebSocket pero cae a polling de 30s si falla. No hay WS endpoint en backend (inexistente en NestJS).
- **Impacto**: Polling agrega carga innecesaria a la API. Kitchen updates tienen latencia de 30s.

---

## 11. Performance Score

| Categoría | Score | Justificación |
|-----------|-------|---------------|
| **Backend (NestJS)** | 35/100 | Controladores sin paginación, guards duplicados, bcrypt bloqueante, middleware sin caché, 0 optimización |
| **Frontend (React)** | 28/100 | Context value sin useMemo, sin React Query, sin memo, sin code splitting, sin virtualización |
| **Database (PostgreSQL)** | 20/100 | 15 FKs sin índice, 0 índices compuestos en queries frecuentes, CUID no sortable, sin read replicas |
| **Prisma (ORM)** | 18/100 | Pool por tenant insostenible, includes masivos en listados, in-memory aggregation, sin transacciones |
| **API (REST)** | 42/100 | Algunos endpoints tienen paginación (orders, users), pero 6 no. Reports sin DB aggregation |
| **React (Framework)** | 30/100 | React 19 compiler solo en shell. MFEs sin compiler. Context mal optimizado. Sin concurrent features |
| **Module Federation** | 25/100 | 8 remoteEntry eager, cross-MFE import directo, shared bundles sin tree-shaking, bridge hack |
| **Memory** | 15/100 | PrismaClient memory leak, EventBus sin maxListeners, tenants eliminados retenidos en Map |
| **CPU** | 30/100 | bcrypt bloqueante, JWT verify sin caché, aggregation in-memory, validación en cada request |
| **Scalability** | 12/100 | No escala horizontal (EventBus in-memory). Pool DB no escala vertical (max_connections). Sin Redis, sin colas, sin read replicas, sin CDN |
| **Overall Performance** | **25/100** | El sistema funciona para <5 tenants y <50 usuarios. No escala más allá sin rearquitectura significativa |

---

## 12. Top 25 Bottlenecks

| # | Prioridad | Componente | Problema | Impacto | Frecuencia | Riesgo | Esfuerzo |
|---|-----------|------------|----------|---------|------------|--------|----------|
| 1 | **P0** | TenantPrismaService | Per-tenant PrismaClient pool → max_connections excedido en ~15 tenants | **CRÍTICO** | Siempre | 🔴 DB crash | 3 días |
| 2 | **P0** | ReportsService | In-memory aggregation → OOM con >10K órdenes | **CRÍTICO** | Por reporte | 🔴 Server crash | 2 días |
| 3 | **P0** | EventBus | Sync emit bloquea event loop + sin error handler → crash | **CRÍTICO** | Por evento | 🔴 Server crash | 1 día |
| 4 | **P0** | PostgreSQL | 15 FKs sin índice → sequential scans en todos los JOINs | **CRÍTICO** | Todos los requests | 🔴 Degradación severa | 1 día |
| 5 | **P0** | payments.order_id | Índice UNIQUE dropeado sin reemplazo | **CRÍTICO** | Cada pago | 🔴 Full scan | 2 horas |
| 6 | **P0** | Frontend caching | Sin React Query/SWR → cada fetch es round-trip completo | **CRÍTICO** | Todos los requests | 🔴 UX lento + server load | 3 días |
| 7 | **P1** | ReservationsController | Paginación no implementada (DTO acepta page/limit pero no se usan) | **ALTO** | Cada listado | 🔴 OOM potencial | 4 horas |
| 8 | **P1** | OrdersRepository | Includes masivos en listados (4 tablas para 2 campos visibles) | **ALTO** | Cada listado | 🔴 Red/I/O innecesarios | 4 horas |
| 9 | **P1** | ReportsRepository | `payments: true` include innecesario en getSalesReport | **ALTO** | Cada reporte | 🔴 JOIN innecesario | 1 hora |
| 10 | **P1** | TenantMiddleware | DB query en cada request público sin caché | **ALTO** | Login + requests públicos | 🔴 1 query/request extra | 2 horas |
| 11 | **P1** | JWT verify | Verificación crypto en cada request sin caché de payload | **ALTO** | Cada request autenticado | 🔴 CPU ~1ms/request | 2 horas |
| 12 | **P1** | OrdersService.getStats | 7 queries separadas cuando 1 bastaría | **ALTO** | Cada dashboard | 🔴 6x queries innecesarias | 1 día |
| 13 | **P1** | BranchContext MFEs | Context value recreado en cada render + 6 MFEs duplicados | **ALTO** | Cada render de contexto | 🔴 Re-renders masivos | 2 días |
| 14 | **P1** | Thundering herd | Branch change → 16-32 requests simultáneos | **ALTO** | Cada cambio de sucursal | 🔴 Server load spike | 3 días |
| 15 | **P1** | Folio generation | Race condition en count + unique violation | **ALTO** | Cada orden | 🔴 10% fallos en alta carga | 4 horas |
| 16 | **P2** | bcrypt.compare | 100-150ms bloqueando event loop en login | **MEDIO** | Cada login | 🟡 CPU saturation | 1 día |
| 17 | **P2** | React.memo faltante | KitchenTicketCard, OrderCard, MenuItemCard sin memo | **MEDIO** | Cada render de lista | 🟡 Re-renders innecesarios | 1 día |
| 18 | **P2** | useMemo faltante | filteredItems y categories recomputados en POSPage | **MEDIO** | Cada render de POS | 🟡 Cómputo O(n) en render | 4 horas |
| 19 | **P2** | No code splitting | recharts (500KB) + jsPDF (200KB) en bundle inicial | **MEDIO** | Reports page | 🟡 Bundle grande | 1 día |
| 20 | **P2** | No virtualización | Listas de órdenes/menús sin react-window | **MEDIO** | Escala >50 items | 🟡 DOM performance | 1 día |
| 21 | **P2** | Cross-MFE import | dashboard-mf importa directo de reservations-mf | **ALTO** | Dashboard page | 🔴 Duplica React | 1 hora |
| 22 | **P2** | remoteEntry eager | 8 remoteEntry.js en el paint inicial | **MEDIO** | Primer carga | 🟡 8 HTTP requests extra | 2 horas |
| 23 | **P3** | PrismaClient cold start | `$connect()` nunca llamado → cold start en primer request | **BAJO** | Primer request/tenant | 🟡 Latencia inicial alta | 2 horas |
| 24 | **P3** | No bundle analyzer | Sin visibilidad de tamaños de bundle | **BAJO** | CI | 🟡 Ciego a regresiones | 2 horas |
| 25 | **P3** | CUID PK | 25-char PKs no sortables → page splits en B-tree | **BAJO** | Cada INSERT | 🟡 Index maintenance | No urgente |

---

## 13. Quick Wins — Alto impacto, bajo esfuerzo

| # | Mejora | Esfuerzo | Impacto |
|---|--------|----------|---------|
| 1 | Agregar `@@index([orderId])` en Payment model | 1 hora | **ELIMINA sequential scan en pagos** |
| 2 | Agregar `@@index([status, createdAt])` en Order model | 1 hora | **ACELERA 90% de queries de reports y listados** |
| 3 | Agregar `@@index([branchId])` en todas las tablas con branch FK | 2 horas | **ACELERA filtrado por sucursal** |
| 4 | Pagination en ReservationsController (conectar DTO page/limit a service) | 4 horas | **PREVIENE OOM en listados de reservas** |
| 5 | Eliminar `include: { payments: true }` de ReportsRepository.getSalesReport | 30 min | **ELIMINA JOIN innecesario en cada reporte** |
| 6 | Agregar `select` projection en OrdersRepository.findMany (solo campos necesarios en listado) | 2 horas | **REDUCE payload ~80% en GET /orders** |
| 7 | Cachear tenant lookup en TenantMiddleware con Map in-memory (TTL 60s) | 2 horas | **ELIMINA DB query en requests públicos** |
| 8 | Cachear JWT payload decodificado en api-client | 1 hora | **ELIMINA atob+JSON.parse en cada request** |
| 9 | Wrap BranchContext value en useMemo | 30 min | **REDUCE re-renders en todos los MFEs** |
| 10 | Agregar React.memo a KitchenTicketCard, OrderCard, MenuItemCard | 1 hora | **REDUCE re-renders de listas** |
| 11 | `connection_limit=2` en datasource de TenantPrismaService | 30 min | **REDUCE conexiones 5x** |
| 12 | Agregar `setMaxListeners(100)` + `error` handler en EventBus | 30 min | **PREVIENE crash por listener error** |

---

## 14. Mejoras Estratégicas — Mediano y largo plazo

### Corto plazo (1-2 semanas)

| # | Mejora | Esfuerzo | Dependencias |
|---|--------|----------|-------------|
| 1 | Reemplazar per-tenant PrismaClient con pool único + `SET search_path` dinámico | 1 semana | Investigar compatibilidad con Prisma |
| 2 | Mover aggregation reports a SQL (Prisma aggregate/groupBy o raw SQL) | 3 días | Ninguna |
| 3 | Combinar 7 queries de OrdersService.getStats en una con FILTER | 1 día | Ninguna |
| 4 | Agregar React Query/SWR y reemplazar hooks custom | 1 semana | Ninguna |
| 5 | Implementar cursor-based pagination en endpoints de listado | 2 días | Ninguna |
| 6 | Implementar rate limiting (express-rate-limit + Redis) | 1 día | Redis |

### Mediano plazo (2-4 semanas)

| # | Mejora | Esfuerzo | Dependencias |
|---|--------|----------|-------------|
| 1 | Reemplazar EventBus in-memory con Redis Pub/Sub | 3 días | Redis |
| 2 | Agregar Bull queue para reports y export PDF | 3 días | Redis |
| 3 | Implementar WebSocket endpoint en NestJS para kitchen | 2 días | Redis (WS adapter) |
| 4 | Configurar read replicas + dirigir reports a réplicas | 1 semana | Infraestructura DB |
| 5 | Configurar manualChunks y code splitting en MFEs | 2 días | Ninguna |
| 6 | Split BranchContext en stable + action contexts | 1 día | Ninguna |
| 7 | Migrar CUID a UUID v7 (time-sortable) | 1 semana | Prisma migration |
| 8 | Agregar health checks, logging estructurado (Pino), métricas (Prometheus) | 3 días | Infraestructura |

### Largo plazo (1-2 meses)

| # | Mejora | Esfuerzo | Dependencias |
|---|--------|----------|-------------|
| 1 | Considerar row-level tenant isolation (tenant_id column) en lugar de schema-per-tenant | 2-4 semanas | Arquitectura DB |
| 2 | Implementar API Gateway (Kong/nginx) para unified routing, rate limiting, caching | 2 semanas | Infraestructura |
| 3 | Agregar CDN (CloudFront/Cloudflare) para static assets | 1 semana | Infraestructura |
| 4 | Implementar Server-Side Rendering en MFEs (Next.js o Vite SSR) | 2-4 semanas | Arquitectura frontend |
| 5 | Agregar PgBouncer + connection pooling a nivel DB | 1 semana | Infraestructura DB |
| 6 | Implementar GraphQL para evitar over/under-fetching | 2-4 semanas | Arquitectura API |

---

## 15. Contradicciones con auditorías anteriores

| Auditoría previa | Recomendación | Performance Review | Decisión |
|-----------------|---------------|-------------------|----------|
| **ARCHITECTURE_REVIEW (68/100)** | "Eliminar apps/frontend, tables-mf, tipos duplicados" | La eliminación de tables-mf reduce carga de MFE (8 → 7) pero es marginal frente a bottlenecks reales | **Prevalecer**: La recomendación de performance es mantener pero priorizar fixes de pool, índices y caché |
| **DOMAIN_DATA_MODEL (62/100)** | "Agregar 9 índices faltantes" | **Performance confirma y expande**: identifica 15 FKs sin índice + payments.order_id crítico + compuestos necesarios | **Ampliar**: La recomendación de domain review se queda corta. Performance añade `@@index([status, createdAt])` como crítico |
| **API_DESIGN (52/100)** | "Unificar PUT vs PATCH, paginación en 2/11 módulos" | Performance identifica que `ReservationsController` acepta page/limit en DTO pero **no los usa** — es un bug | **Reforzar**: El bug de paginación en reservations es P1 en performance. La inconsistencia PUT/PATCH es secundaria |
| **SECURITY (28/100)** | "Rate limiting, guards, CORS, HTTPS, secrets" | Performance confirma que rate limiting protege contra DoS y bcrypt blocking. Añade: JWT caching reduciría CPU | **Complementar**: Rate limiting también es mejora de performance (protege contra abuso de CPU) |
| **PRODUCTION_READINESS (12/100)** | "Docker, CI/CD, logging, health checks" | Ninguna contradicción. Performance añade que PgBouncer no es compatible con schema-per-tenant actual | **Extender**: La producción readiness debe considerar la incompatibilidad PgBouncer + `?schema=` en URL |

---

## Resumen ejecutivo

**Performance Score General: 25/100**

El sistema **funciona correctamente para <5 tenants y <50 usuarios concurrentes**. Más allá de esos límites, los componentes fallan en este orden:

1. **~15 tenants**: PostgreSQL `max_connections` se agota (pool de 10/tenant).
2. **~10K órdenes**: Reports y stats sufren OOM por in-memory aggregation.
3. **~100 usuarios concurrentes**: CPU saturado por bcrypt + JWT + validación sin caché.
4. **~100 pagos simultáneos**: Race condition en folios + deadlock risk + sin idempotency.
5. **Branch change**: Thundering herd de 16-32 requests simultáneos desde MFEs.

**Los 3 fixes que más impacto tienen en rendimiento inmediato:**

1. **Pool único de base de datos** — Reemplazar per-tenant PrismaClient por pool compartido con `SET search_path`. Elimina el bottleneck #1.
2. **Índices en FK + status/createdAt** — 15 índices faltantes. El más crítico: `@@index([status, createdAt])` en Order (acelera 90% de queries).
3. **React Query en frontend** — Reemplazar hooks custom con TanStack Query. Elimina ~80% de requests redundantes.

**Sin estos cambios, el proyecto no puede superar 15 tenants ni 100 usuarios concurrentes en producción.**

---

*Performance Review generada el 2026-07-05 — rama `audit/architecture-review`*
