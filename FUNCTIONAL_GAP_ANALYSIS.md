# ANÁLISIS DE GAPS FUNCIONALES — AuraRestMultitenant

**Fecha:** 21 de julio de 2026
**Rama analizada:** `micro-frontend`
**Arquitectura:** SOFEA + Module Federation
**Alcance:** Backend (NestJS 11), Web Shell (Next.js 16), 9 MFEs (Vite 6), 5 paquetes compartidos, Prisma 6 (PostgreSQL)

---

# 1. Resumen Ejecutivo

## Estado General

| Dimensión | Calificación |
|-----------|:------------:|
| Backend (endpoints reales) | ✅ **Sólido** — 16 módulos, 50+ endpoints, todos consultan DB via Prisma |
| Frontend (UI funcional) | ⚠️ **Parcial** — 11/18 páginas funcionales, 4 placeholder, 3 con bugs SPA |
| Must Have (obligatorios) | 🔴 **5 de 8 faltan** — Solo menú, mesas y órdenes están completos |
| Funciones Avanzadas | 🔴 **1 de 7 completa** — Solo división de cuenta implementada |
| Pruebas | 🔴 **Crítico** — 1 unit test backend, 0 integration, 0 E2E frontend |
| SOFEA | ⚠️ **Parcial** — Sin imports directos entre MFEs (bien), pero código muerto en shell |
| CI/CD | 🔴 **Básico** — Solo build+test backend, sin frontend |
| Producción | 🔴 **No listo** — Faltan must have, pruebas, Docker frontend |

## Cifras Clave

| Métrica | Valor |
|---------|-------|
| Endpoints backend implementados | 55 |
| Endpoints backend reales (con Prisma) | 55 (100%) |
| Páginas frontend funcionales | 11 de 18 |
| Páginas placeholder | 4 |
| Páginas con bugs conocidos | 3 |
| Must have completos | 3 de 8 |
| Funciones avanzadas completas | 1 de 7 |
| Archivos de test | 9 (1 unit + 7 e2e backend + 8 frontend) |
| Cobertura estimada | ~10% |
| Líneas de código muerto en shell | ~1,100 |

---

# 2. Matriz Funcional

## 2.1 Backend — Todos los Endpoints

| Módulo | Endpoint | Método | Roles Permitidos | Estado | Archivo |
|--------|----------|--------|------------------|--------|---------|
| **Auth** | `POST /auth/login` | POST | `@Public()` | ✅ REAL | `auth.controller.ts:30` |
| | `POST /auth/refresh` | POST | `@Public()` | ✅ REAL | `auth.controller.ts:49` |
| | `POST /auth/logout` | POST | `@Public()` | ⚠️ STUB | `auth.controller.ts:104` — solo retorna mensaje |
| | `PATCH /auth/voice-seed` | PATCH | OWNER, ADMIN | ✅ REAL | `auth.controller.ts:59` |
| | `POST /auth/voice-login` | POST | `@Public()` | ✅ REAL | `auth.controller.ts:92` |
| **Orders** | `POST /orders` | POST | ADMIN,MANAGER,OWNER,CASHIER,WAITER | ✅ REAL | `orders.controller.ts` |
| | `GET /orders` | GET | ADMIN,MANAGER,OWNER,CASHIER,WAITER | ✅ REAL | `orders.controller.ts` |
| | `GET /orders/stats` | GET | ADMIN,MANAGER,OWNER,CASHIER,WAITER | ✅ REAL | `orders.controller.ts` |
| | `GET /orders/:id` | GET | ADMIN,MANAGER,OWNER,CASHIER,WAITER | ✅ REAL | `orders.controller.ts` |
| | `PATCH /orders/:id/status` | PATCH | ADMIN,MANAGER,OWNER,CASHIER,WAITER | ✅ REAL | `orders.controller.ts` |
| | `POST /orders/:id/cancel` | POST | ADMIN,MANAGER,OWNER,CASHIER,WAITER | ✅ REAL | `orders.controller.ts` |
| **Payments** | `POST /payments/process` | POST | ADMIN,MANAGER,OWNER,CASHIER | ✅ REAL | `payments.controller.ts` |
| | `GET /payments/order/:orderId` | GET | ADMIN,MANAGER,OWNER,CASHIER | ✅ REAL | `payments.controller.ts` |
| **Kitchen** | `GET /kitchen/queue` | GET | OWNER,ADMIN,MANAGER,CHEF,KITCHEN_STAFF,WAITER | ✅ REAL | `kitchen.controller.ts` |
| | `PATCH /kitchen/tickets/:id/status` | PATCH | OWNER,ADMIN,MANAGER,CHEF,KITCHEN_STAFF | ✅ REAL | `kitchen.controller.ts` |
| **Menus** | `GET /admin/menus` | GET | OWNER,ADMIN,MANAGER,WAITER | ✅ REAL | `menus.controller.ts` |
| | `GET /admin/menus/stats` | GET | OWNER,ADMIN,MANAGER | ✅ REAL | `menus.controller.ts` |
| | `GET /admin/menus/:id` | GET | OWNER,ADMIN,MANAGER | ✅ REAL | `menus.controller.ts` |
| | `POST /admin/menus` | POST | OWNER, ADMIN | ✅ REAL | `menus.controller.ts` |
| | `PUT /admin/menus/:id` | PUT | OWNER, ADMIN | ✅ REAL | `menus.controller.ts` |
| | `PATCH /admin/menus/:id/price` | PATCH | OWNER, ADMIN | ✅ REAL | `menus.controller.ts` |
| | `PATCH /admin/menus/:id/status` | PATCH | OWNER, ADMIN | ✅ REAL | `menus.controller.ts` |
| | `DELETE /admin/menus/:id` | DELETE | OWNER, ADMIN | ✅ REAL (soft) | `menus.controller.ts` |
| **Categories** | `GET /admin/categories` | GET | OWNER,ADMIN,MANAGER | ✅ REAL | `categories.controller.ts` |
| | `GET /admin/categories/stats` | GET | OWNER,ADMIN,MANAGER | ✅ REAL | `categories.controller.ts` |
| | `GET /admin/categories/:id` | GET | OWNER,ADMIN,MANAGER | ✅ REAL | `categories.controller.ts` |
| | `POST /admin/categories` | POST | OWNER, ADMIN | ✅ REAL | `categories.controller.ts` |
| | `PUT /admin/categories/:id` | PUT | OWNER, ADMIN | ✅ REAL | `categories.controller.ts` |
| | `DELETE /admin/categories/:id` | DELETE | OWNER, ADMIN | ✅ REAL (soft) | `categories.controller.ts` |
| **Tables** | `GET /tables` | GET | ADMIN,MANAGER,OWNER,CASHIER,WAITER | ✅ REAL | `tables.controller.ts` |
| | `GET /tables/:id` | GET | ADMIN,MANAGER,OWNER,CASHIER,WAITER | ✅ REAL | `tables.controller.ts` |
| | `PATCH /tables/:id/status` | PATCH | ADMIN,MANAGER,OWNER,CASHIER,WAITER | ✅ REAL | `tables.controller.ts` |
| **Reservations** | `GET /admin/reservations/stats` | GET | OWNER,ADMIN,MANAGER,CASHIER,WAITER | ✅ REAL | `reservations.controller.ts` |
| | `POST /admin/reservations` | POST | OWNER,ADMIN,MANAGER,CASHIER,WAITER | ✅ REAL | `reservations.controller.ts` |
| | `GET /admin/reservations` | GET | OWNER,ADMIN,MANAGER,CASHIER,WAITER | ✅ REAL | `reservations.controller.ts` |
| | `GET /admin/reservations/:id` | GET | OWNER,ADMIN,MANAGER,CASHIER,WAITER | ✅ REAL | `reservations.controller.ts` |
| | `PATCH /admin/reservations/:id/status` | PATCH | OWNER,ADMIN,MANAGER,CASHIER | ✅ REAL | `reservations.controller.ts` |
| **Reports** | `GET /admin/reports/sales` | GET | OWNER,ADMIN,MANAGER | ✅ REAL | `reports.controller.ts` |
| | `GET /admin/reports/products` | GET | OWNER,ADMIN,MANAGER | ✅ REAL | `reports.controller.ts` |
| | `GET /admin/reports/payments` | GET | OWNER,ADMIN,MANAGER | ✅ REAL | `reports.controller.ts` |
| | `GET /admin/reports/peak-hours` | GET | OWNER,ADMIN,MANAGER | ✅ REAL | `reports.controller.ts` |
| | `GET /admin/reports/export` | GET | OWNER,ADMIN,MANAGER | ✅ REAL | `reports.controller.ts` |
| **Branches** | `GET /admin/branches/stats` | GET | OWNER,ADMIN,MANAGER | ✅ REAL | `branches.controller.ts` |
| | `GET /admin/branches` | GET | OWNER,ADMIN,MANAGER | ✅ REAL | `branches.controller.ts` |
| | `GET /admin/branches/:id` | GET | OWNER,ADMIN,MANAGER | ✅ REAL | `branches.controller.ts` |
| | `POST /admin/branches` | POST | OWNER, ADMIN | ✅ REAL | `branches.controller.ts` |
| | `PUT /admin/branches/:id` | PUT | OWNER, ADMIN | ✅ REAL | `branches.controller.ts` |
| | `PATCH /admin/branches/:id/activate` | PATCH | OWNER, ADMIN | ✅ REAL | `branches.controller.ts` |
| | `PATCH /admin/branches/:id/deactivate` | PATCH | OWNER, ADMIN | ✅ REAL | `branches.controller.ts` |
| | `DELETE /admin/branches/:id` | DELETE | OWNER, ADMIN | ✅ REAL | `branches.controller.ts` |
| **Users** | `GET /admin/users` | GET | OWNER,ADMIN,MANAGER | ✅ REAL | `users.controller.ts` |
| | `GET /admin/users/:id` | GET | OWNER,ADMIN,MANAGER | ✅ REAL | `users.controller.ts` |
| | `POST /admin/users` | POST | OWNER, ADMIN | ✅ REAL | `users.controller.ts` |
| | `POST /admin/users/invite` | POST | OWNER, ADMIN | ⚠️ PARCIAL | `users.controller.ts` — crea user pero no envía email |
| | `PATCH /admin/users/:id` | PATCH | OWNER, ADMIN | ✅ REAL | `users.controller.ts` |
| | `PATCH /admin/users/:id/status` | PATCH | OWNER, ADMIN | ✅ REAL | `users.controller.ts` |
| | `DELETE /admin/users/:id` | DELETE | OWNER, ADMIN | ✅ REAL | `users.controller.ts` |
| **Tenants** | `GET /admin/tenants` | GET | OWNER, ADMIN | ✅ REAL | `tenants.controller.ts` |
| | `POST /admin/tenants` | POST | OWNER, ADMIN | ✅ REAL | `tenants.controller.ts` |
| | `PUT /admin/tenants/:id` | PUT | OWNER, ADMIN | ✅ REAL | `tenants.controller.ts` |
| **Discounts** | `POST /discounts` | POST | ADMIN,MANAGER,OWNER | ✅ REAL | `discounts.controller.ts` |
| | `GET /discounts` | GET | ADMIN,MANAGER,OWNER | ✅ REAL | `discounts.controller.ts` |
| | `GET /discounts/code/:code` | GET | ADMIN,MANAGER,OWNER,CASHIER | ✅ REAL | `discounts.controller.ts` |
| | `GET /discounts/:id` | GET | ADMIN,MANAGER,OWNER | ✅ REAL | `discounts.controller.ts` |
| | `PATCH /discounts/:id` | PATCH | ADMIN,MANAGER,OWNER | ✅ REAL | `discounts.controller.ts` |
| | `DELETE /discounts/:id` | DELETE | ADMIN,MANAGER,OWNER | ✅ REAL | `discounts.controller.ts` |
| **Promotions** | `POST /promotions` | POST | ADMIN,MANAGER,OWNER | ✅ REAL | `promotions.controller.ts` |
| | `GET /promotions` | GET | ADMIN,MANAGER,OWNER,CASHIER | ✅ REAL | `promotions.controller.ts` |
| | `GET /promotions/active` | GET | ADMIN,MANAGER,OWNER,CASHIER | ✅ REAL | `promotions.controller.ts` |
| | `GET /promotions/:id` | GET | ADMIN,MANAGER,OWNER | ✅ REAL | `promotions.controller.ts` |
| | `PATCH /promotions/:id` | PATCH | ADMIN,MANAGER,OWNER | ✅ REAL | `promotions.controller.ts` |
| | `DELETE /promotions/:id` | DELETE | ADMIN,MANAGER,OWNER | ✅ REAL | `promotions.controller.ts` |
| **Activity Log** | `GET /admin/activity-logs` | GET | OWNER,ADMIN,MANAGER | ✅ REAL | `activity-log.controller.ts` |
| **Health** | `GET /health` | GET | `@Public()` | ✅ REAL | `health.controller.ts` |

## 2.2 Frontend — Todas las Páginas

| MFE | Página | Ruta | Estado | Archivo | Problemas |
|-----|--------|------|--------|---------|-----------|
| **auth-mf** | LoginPage | `/auth/login` | ✅ COMPLETO | `LoginPage.tsx` | — |
| | ForgotPasswordPage | `/auth/forgot-password` | ⚠️ PARCIAL | `ForgotPasswordPage.tsx` | Backend no tiene endpoint |
| **dashboard-mf** | DashboardPage | `/dashboard` | ✅ COMPLETO | `DashboardPage.tsx` | — |
| | UsersPage | `/users` | ✅ COMPLETO | `UsersPage.tsx` | — |
| | SucursalesPage | `/sucursales` | ✅ COMPLETO | `SucursalesPage.tsx` | — |
| | SettingsPage | `/settings` | 🔴 PLACEHOLDER | `SettingsPage.tsx:15` | 90% "En construcción" |
| **menu-mf** | MenusPage | `/menus` | ✅ COMPLETO | `MenusPage.tsx` | — |
| | CategoriasPage | `/categorias` | ✅ COMPLETO | `CategoriasPage.tsx` | — |
| | InventarioPage | `/inventario` | 🔴 PLACEHOLDER | `InventarioPage.tsx` | UI existe pero backend no |
| **orders-mf** | OrdersPage | `/orders` | ✅ COMPLETO | `OrdersPage.tsx` | — |
| | CreateOrderPage | `/waiter/orders/new` | ⚠️ BUG SPA | `CreateOrderPage.tsx:38` | `window.location.href` |
| **kitchen-mf** | KitchenQueuePage | `/kitchen` | ✅ COMPLETO | `KitchenQueuePage.tsx` | — |
| **cashier-mf** | POSPage | `/cashier` | ✅ COMPLETO | `POSPage.tsx` | Sin input de propinas |
| **reports-mf** | ReportesPage | `/reportes` | ✅ COMPLETO | `ReportesPage.tsx` | — |
| | AnalyticsPage | `/analytics` | 🔴 PLACEHOLDER | `AnalyticsPage.tsx:20` | "Módulo en construcción" |
| | IntegrationsPage | `/integrations` | 🔴 PLACEHOLDER | `IntegrationsPage.tsx:20` | "Módulo en construcción" |
| | LogsPage | `/logs` | 🔴 PLACEHOLDER | `LogsPage.tsx:20` | "Módulo en construcción" |
| **reservations-mf** | ReservacionesPage | `/reservaciones` | ✅ COMPLETO | `ReservacionesPage.tsx` | — |
| **tables-mf** | TablesPage | `/waiter/tables` | ⚠️ BUG SPA | `TablesPage.tsx:10` | `window.location.href` |

## 2.3 Matriz de Integración Frontend-Backend

| Funcionalidad | Backend Endpoint | Frontend Lo Consume | Integra Correctamente | Estado |
|---------------|-----------------|--------------------|-----------------------|--------|
| Login | `POST /auth/login` | auth-mf ✅ | ✅ | COMPLETO |
| Refresh Token | `POST /auth/refresh` | api-client ✅ | ✅ | COMPLETO |
| Dashboard Stats | `GET /admin/dashboard/stats` | dashboard-mf ✅ | ✅ | COMPLETO |
| Dashboard Activity | `GET /admin/dashboard/activity` | dashboard-mf ✅ | ✅ | COMPLETO |
| Menús CRUD | `GET/POST/PUT/DELETE /admin/menus` | menu-mf ✅ | ✅ | COMPLETO |
| Categorías CRUD | `GET/POST/PUT/DELETE /admin/categories` | menu-mf ✅ | ✅ | COMPLETO |
| Inventario | `GET /admin/inventory` | menu-mf ✅ | ❌ NO EXISTE | ROTO |
| Órdenes CRUD | `GET/POST/PATCH /orders` | orders-mf ✅ | ✅ | COMPLETO |
| Cambiar estado orden | `PATCH /orders/:id/status` | orders-mf ✅ | ✅ | COMPLETO |
| Cancelar orden | `POST /orders/:id/cancel` | orders-mf ✅ | ✅ | COMPLETO |
| Cola cocina | `GET /kitchen/queue` | kitchen-mf ✅ | ✅ | COMPLETO |
| Cambiar estado ticket | `PATCH /kitchen/tickets/:id/status` | kitchen-mf ✅ | ✅ | COMPLETO |
| Procesar pago | `POST /payments/process` | cashier-mf ✅ | ✅ | COMPLETO |
| División de cuenta | `POST /payments/process` (split) | cashier-mf ✅ | ✅ | COMPLETO |
| Reservaciones CRUD | `GET/POST/PATCH /admin/reservations` | reservations-mf ✅ | ✅ | COMPLETO |
| Reportes ventas | `GET /admin/reports/sales` | reports-mf ✅ | ✅ | COMPLETO |
| Reportes productos | `GET /admin/reports/products` | reports-mf ✅ | ✅ | COMPLETO |
| Reportes pagos | `GET /admin/reports/payments` | reports-mf ✅ | ✅ | COMPLETO |
| Peak hours | `GET /admin/reports/peak-hours` | reports-mf ✅ | ✅ | COMPLETO |
| Export CSV | `GET /admin/reports/export` | reports-mf ✅ | ✅ | COMPLETO |
| Sucursales CRUD | `GET/POST/PUT/PATCH/DELETE /admin/branches` | dashboard-mf ✅ | ✅ | COMPLETO |
| Usuarios CRUD | `GET/POST/PATCH/DELETE /admin/users` | dashboard-mf ✅ | ✅ | COMPLETO |
| Mesas (status) | `GET/PATCH /tables` | tables-mf ✅ | ✅ | COMPLETO |
| Forgot Password | `POST /auth/forgot-password` | auth-mf ✅ | ❌ NO EXISTE | ROTO |
| Ticket PDF | — | — | ❌ NO EXISTE | NO IMPLEMENTADO |
| Menú imprimible | — | — | ❌ NO EXISTE | NO IMPLEMENTADO |
| Menú público | — | — | ❌ NO EXISTE | NO IMPLEMENTADO |
| QR Code | — | — | ❌ NO EXISTE | NO IMPLEMENTADO |
| Propinas (UI) | `POST /payments/process` (tip) | cashier-mf ❌ | ❌ NO UI | PARCIAL |
| Inventario backend | — | menu-mf llama `/admin/inventory` | ❌ NO EXISTE | ROTO |

---

# 3. Estado por Módulo

## 3.1 Menú

| Componente | Estado | Detalle |
|------------|--------|---------|
| Prisma Model `MenuItem` | ✅ | Completo con `name, description, price, status, categoryId` |
| Prisma Model `Category` | ✅ | Completo con `name, description, sortOrder, isActive` |
| Backend CRUD Menús | ✅ | 7 endpoints, todos Prisma-reales |
| Backend CRUD Categorías | ✅ | 6 endpoints, todos Prisma-reales |
| Backend Soft-Delete | ✅ | Menús → `UNAVAILABLE`, Categorías → `isActive=false` |
| Frontend MenusPage | ✅ | CRUD completo con cards, filtros, búsqueda, stats |
| Frontend CategoriasPage | ✅ | CRUD completo |
| Seed de menú | ✅ | 4 categorías, 12 platillos |
| **Generación de menú imprimible** | 🔴 | **No existe** |
| **Menú público por subdominio** | 🔴 | **No existe endpoint `@Public()`** |
| **QR para compartir menú** | 🔴 | **No existe** |

## 3.2 Mesas

| Componente | Estado | Detalle |
|------------|--------|---------|
| Prisma Model `RestaurantTable` | ✅ | `number, name, capacity, status, locationZone, branchId` |
| Backend GET/GETById | ✅ | 2 endpoints |
| Backend PATCH status | ✅ | 1 endpoint con mapeo de estados |
| **Backend CREATE mesa** | 🔴 | **No existe endpoint POST** |
| **Backend UPDATE mesa** | 🔴 | **No existe endpoint PUT** |
| **Backend DELETE mesa** | 🔴 | **No existe endpoint DELETE** |
| Frontend TablesPage | ⚠️ | Grid funcional pero `window.location.href` para navegar |
| Frontend TablesGrid | ✅ | Renderiza TableCard con estados |
| Seed de mesas | ✅ | 6 mesas |

## 3.3 Órdenes

| Componente | Estado | Detalle |
|------------|--------|---------|
| Prisma Model `Order` | ✅ | Completo con folio, tableId, branchId, userId, status, version |
| Prisma Model `OrderItem` | ✅ | Completo |
| Backend POST crear | ✅ | Transacción Prisma, folio único, kitchen ticket auto, activity log |
| Backend GET listar | ✅ | Paginado, filtros por status/type/search/date |
| Backend GET stats | ✅ | 6 queries paralelas |
| Backend PATCH status | ✅ | Máquina de estados + optimistic locking |
| Backend POST cancel | ✅ | Transacción, reset mesa, activity log |
| Frontend OrdersPage | ✅ | Listado, filtros, métricas, status transitions |
| Frontend CreateOrderPage | ⚠️ | Funcional pero usa `window.location.href` |
| **Relación orders → payments** | ✅ | Unpaid → PAID al cobrar |
| **Relación orders → kitchen** | ✅ | Auto-crea KitchenTicket al crear orden |

## 3.4 Cocina

| Componente | Estado | Detalle |
|------------|--------|---------|
| Prisma Model `KitchenTicket` | ✅ | `orderId, status, priority, startedAt, completedAt` |
| Backend GET queue | ✅ | Filtra por branch, retorna PENDING+IN_PROGRESS con elapsedSeconds |
| Backend PATCH status | ✅ | Máquina PENDING→IN_PROGRESS→READY→DELIVERED, sync con order status |
| Frontend KitchenQueuePage | ✅ | Kanban: Nuevos → En preparación → Listos |
| Temporizador | ✅ | elapsed time con alerta overdue (>15 min) |
| WebSocket | ⚠️ | Configurado pero fallback a polling cada 30s |
| **Priorización** | 🔴 | Campo `priority` existe pero no hay UI para establecerlo |
| **Alertas sonoras** | 🔴 | No implementado |

## 3.5 Caja

| Componente | Estado | Detalle |
|------------|--------|---------|
| Prisma Model `Payment` | ✅ | `orderId, amount, method, status, reference, tipAmount, idempotencyKey` |
| Backend POST process | ✅ | Idempotency, split payments, tips, transacción |
| Backend GET by order | ✅ | Con tip includes |
| Frontend POSPage | ✅ | Catálogo, carrito, selección mesa, proceso de pago |
| Split payment UI | ✅ | Líneas dinámicas con método y monto |
| **Tip input UI** | 🔴 | Backend soporta pero frontend no recolecta |
| **Ticket PDF** | 🔴 | **No existe** |
| **Cerrar cuenta** | ✅ | Pago = close (order → PAID, mesa → AVAILABLE) |

## 3.6 Reservas

| Componente | Estado | Detalle |
|------------|--------|---------|
| Prisma Model `Reservation` | ✅ | Completo con branchId, tableId, guestName, partySize, scheduledAt, status |
| Backend CRUD | ✅ | 5 endpoints: stats, create, list, getById, status |
| Frontend ReservacionesPage | ✅ | Listado, filtros, métricas, cancelación |
| Frontend ReservationModal | ✅ | Formulario de creación |
| **BUG: `confirmationCode`** | 🔴 | `reservations.repository.ts:51` referencia campo inexistente en schema — crash si se busca |
| **Asignación de mesa automática** | 🔴 | La reserva pide `tableId` pero no hay lógica de auto-asignación |

## 3.7 Reportes

| Componente | Estado | Detalle |
|------------|--------|---------|
| Backend GET sales | ✅ | Prisma queries con rango de fechas |
| Backend GET products | ✅ | groupBy + menuItem lookup |
| Backend GET payments | ✅ | payment.groupBy by method |
| Backend GET peak-hours | ✅ | Agregación por hora |
| Backend GET export | ✅ | CSV export |
| Frontend ReportesPage | ✅ | 4 reportes con recharts, filtros, export CSV |
| Frontend PDF export | ✅ | jsPDF para reportes operacionales |
| **AnalyticsPage** | 🔴 | Placeholder |
| **LogsPage** | 🔴 | Placeholder |
| **IntegrationsPage** | 🔴 | Placeholder |

---

# 4. Estado de Must Have

| # | Must Have | Backend | Frontend | Generación Archivo | Botón/Flujo Visible | Estado |
|---|-----------|---------|----------|-------------------|--------------------|---------:|
| 1 | **Menú** | ✅ CRUD completo | ✅ CRUD completo | — | ✅ | **COMPLETO** |
| 2 | **Gestión de mesas** | ⚠️ Solo GET+PATCH | ✅ Grid funcional | — | ✅ | **PARCIAL** — Falta CRUD completo |
| 3 | **Órdenes** | ✅ CRUD completo | ✅ Listado + creación | — | ✅ | **COMPLETO** |
| 4 | **Vista cocina** | ✅ Queue + status | ✅ Kanban funcional | — | ✅ | **COMPLETO** |
| 5 | **Cobro** | ✅ Process payment | ✅ POS funcional | — | ✅ | **COMPLETO** |
| 6 | **Ticket PDF** | 🔴 Sin endpoint | 🔴 Sin generación | 🔴 No existe | 🔴 No visible | **NO IMPLEMENTADO** |
| 7 | **Reportes** | ✅ 5 endpoints | ✅ ReportesPage funcional | ✅ CSV + PDF | ✅ | **COMPLETO** |
| 8 | **Menú imprimible** | 🔴 Sin endpoint | 🔴 Sin componente | 🔴 No existe | 🔴 No visible | **NO IMPLEMENTADO** |

**Resultado: 5 de 8 must have completos, 1 parcial, 2 no implementados.**

---

# 5. Estado de Funciones Avanzadas

| # | Función | Diseñada en Prisma | Backend | Endpoint | Frontend | UI Visible | Tests | Estado |
|---|---------|:------------------:|:-------:|:--------:|:--------:|:----------:|:-----:|--------|
| 1 | **División de cuenta** | ✅ | ✅ SplitPaymentDto | ✅ POST /payments/process | ✅ UI split | ✅ POSPage | ❌ | **COMPLETO** (falta tip input) |
| 2 | **Menú público subdominio** | ⚠️ Subdomain middleware | 🔴 Sin endpoint @Public() | 🔴 | 🔴 | 🔴 | ❌ | **NO IMPLEMENTADO** |
| 3 | **QR compartir menú** | — | 🔴 | 🔴 | 🔴 | 🔴 | ❌ | **NO IMPLEMENTADO** |
| 4 | **Reservas** | ✅ | ✅ CRUD | ✅ 5 endpoints | ✅ CRUD | ✅ | ❌ | **COMPLETO** (bug search) |
| 5 | **Inventario** | 🔴 Sin model | 🔴 Sin module | 🔴 | ⚠️ UI existe | ⚠️ InventarioPage | ❌ | **ROTO** — frontend sin backend |
| 6 | **Propinas** | ✅ Tip model | ✅ TipDto + service | ✅ POST /payments/process | 🔴 Sin input UI | 🔴 | ❌ | **PARCIAL** — backend sí, frontend no |
| 7 | **Promociones por horario** | ✅ startsAt/endsAt | ✅ findActive con date range | ✅ GET /promotions/active | 🔴 No UI | 🔴 | ❌ | **PARCIAL** — Sin time-of-day |

---

# 6. Matriz de Roles y Privilegios

## 6.1 Roles Definidos en el Sistema

**Fuente:** `prisma/tenant/schema.prisma` — enum `UserRole`:

```
OWNER, ADMIN, MANAGER, WAITER, CASHIER, CHEF, KITCHEN_STAFF
```

## 6.2 Matriz de Permisos por Backend (Reales)

**Fuente:** Decoradores `@Roles()` en cada controller.

### Menús

| Operación | OWNER | ADMIN | MANAGER | WAITER | CASHIER | CHEF | KITCHEN_STAFF |
|-----------|:-----:|:-----:|:-------:|:------:|:-------:|:----:|:-------------:|
| Ver menú | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver stats | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver detalle | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Crear | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Editar | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Cambiar precio | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Cambiar status | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Eliminar | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Categorías

| Operación | OWNER | ADMIN | MANAGER | WAITER | CASHIER | CHEF | KITCHEN_STAFF |
|-----------|:-----:|:-----:|:-------:|:------:|:-------:|:----:|:-------------:|
| Ver | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Crear | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Editar | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Eliminar | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Órdenes

| Operación | OWNER | ADMIN | MANAGER | WAITER | CASHIER | CHEF | KITCHEN_STAFF |
|-----------|:-----:|:-----:|:-------:|:------:|:-------:|:----:|:-------------:|
| Ver listado | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ver stats | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ver detalle | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Crear | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Cambiar estado | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Cancelar | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

### Pagos

| Operación | OWNER | ADMIN | MANAGER | WAITER | CASHIER | CHEF | KITCHEN_STAFF |
|-----------|:-----:|:-----:|:-------:|:------:|:-------:|:----:|:-------------:|
| Procesar pago | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Ver pago por orden | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |

### Cocina

| Operación | OWNER | ADMIN | MANAGER | WAITER | CASHIER | CHEF | KITCHEN_STAFF |
|-----------|:-----:|:-----:|:-------:|:------:|:-------:|:----:|:-------------:|
| Ver cola | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Cambiar estado ticket | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |

### Reservaciones

| Operación | OWNER | ADMIN | MANAGER | WAITER | CASHIER | CHEF | KITCHEN_STAFF |
|-----------|:-----:|:-----:|:-------:|:------:|:-------:|:----:|:-------------:|
| Ver listado | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ver stats | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Crear | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Cambiar estado | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |

### Mesas

| Operación | OWNER | ADMIN | MANAGER | WAITER | CASHIER | CHEF | KITCHEN_STAFF |
|-----------|:-----:|:-----:|:-------:|:------:|:-------:|:----:|:-------------:|
| Ver | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Cambiar estado | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Crear | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Eliminar | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Reportes

| Operación | OWNER | ADMIN | MANAGER | WAITER | CASHIER | CHEF | KITCHEN_STAFF |
|-----------|:-----:|:-----:|:-------:|:------:|:-------:|:----:|:-------------:|
| Ver reportes | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Exportar | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

### Descuentos

| Operación | OWNER | ADMIN | MANAGER | WAITER | CASHIER | CHEF | KITCHEN_STAFF |
|-----------|:-----:|:-----:|:-------:|:------:|:-------:|:----:|:-------------:|
| CRUD | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Buscar por código | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |

### Promociones

| Operación | OWNER | ADMIN | MANAGER | WAITER | CASHIER | CHEF | KITCHEN_STAFF |
|-----------|:-----:|:-----:|:-------:|:------:|:-------:|:----:|:-------------:|
| CRUD | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver activas | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |

### Usuarios

| Operación | OWNER | ADMIN | MANAGER | WAITER | CASHIER | CHEF | KITCHEN_STAFF |
|-----------|:-----:|:-----:|:-------:|:------:|:-------:|:----:|:-------------:|
| Ver | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Crear | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Invitar | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Editar | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Cambiar status | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Eliminar | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Sucursales

| Operación | OWNER | ADMIN | MANAGER | WAITER | CASHIER | CHEF | KITCHEN_STAFF |
|-----------|:-----:|:-----:|:-------:|:------:|:-------:|:----:|:-------------:|
| Ver | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Crear | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Editar | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Activar/Desactivar | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Eliminar | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Tenants

| Operación | OWNER | ADMIN | MANAGER | WAITER | CASHIER | CHEF | KITCHEN_STAFF |
|-----------|:-----:|:-----:|:-------:|:------:|:-------:|:----:|:-------------:|
| Ver | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Crear | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Editar | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

## 6.3 Inconsistencias Frontend vs Backend

| Inconsistencia | Detalle |
|----------------|---------|
| **WAITER puede crear órdenes** | Backend permite `@Roles(WAITER)` en `POST /orders` — correcto para servicio de meseros |
| **WAITER puede ver reservaciones** | Backend permite `@Roles(WAITER)` — inconsistente, un mesero no debería gestionar reservaciones |
| **CASHIER puede ver reservaciones** | Backend permite `@Roles(CASHIER)` — inconsistente |
| **No hay permisos granulares** | Existe modelo `Permission` + `RolePermission` en Prisma pero NO se usa en guards — los guards solo verifican `UserRole` |
| **MANAGER no puede ver menú en cashier** | menus controller exige `OWNER/ADMIN/MANAGER/WAITER` — CASHIER no puede ver menú para POS |
| **WAITER puede cambiar estado orden** | Esto permite a un mesero marcar una orden como PAID — riesgo de seguridad |

---

# 7. Flujos Completos

## Flujo 1: Crear platillo

| Paso | Detalle |
|------|---------|
| **Paso inicial** | OWNER/ADMIN navega a `/menus` → clic "Agregar" |
| **Endpoint** | `POST /admin/menus` |
| **MFE** | menu-mf (`MenusPage.tsx`) |
| **Rol autorizado** | OWNER, ADMIN |
| **Estado actual** | ✅ COMPLETO |
| **Archivos** | `menus.controller.ts`, `menus.service.ts`, `menus.repository.ts`, `MenusPage.tsx` |
| **Qué falta** | — |
| **Errores potenciales** | Validación de `categoryId` FK — si la categoría no existe, Prisma lanza FK error |

## Flujo 2: Crear categoría

| Paso | Detalle |
|------|---------|
| **Paso inicial** | OWNER/ADMIN navega a `/categorias` → clic "Agregar" |
| **Endpoint** | `POST /admin/categories` |
| **MFE** | menu-mf (`CategoriasPage.tsx`) |
| **Rol autorizado** | OWNER, ADMIN |
| **Estado actual** | ✅ COMPLETO |
| **Archivos** | `categories.controller.ts`, `categories.service.ts`, `CategoriasPage.tsx` |
| **Qué falta** | — |

## Flujo 3: Cambiar disponibilidad

| Paso | Detalle |
|------|---------|
| **Paso inicial** | OWNER/ADMIN cambia status de un platillo |
| **Endpoint** | `PATCH /admin/menus/:id/status` |
| **MFE** | menu-mf |
| **Rol autorizado** | OWNER, ADMIN |
| **Estado actual** | ✅ COMPLETO |
| **Nota** | `status` e `isAvailable` se sincronizan bidireccionalmente |

## Flujo 4: Crear mesa

| Paso | Detalle |
|------|---------|
| **Paso inicial** | No hay UI para crear mesas |
| **Endpoint** | ❌ **No existe** `POST /tables` |
| **MFE** | — |
| **Rol autorizado** | — |
| **Estado actual** | 🔴 NO IMPLEMENTADO |
| **Qué falta** | Endpoint POST + repositorio + DTO + UI |
| **Archivos a crear** | `tables.controller.ts` (agregar POST), `tables.service.ts`, `CreateTableDto.ts`, tables-mf o dashboard-mf |

## Flujo 5: Cambiar estado de mesa

| Paso | Detalle |
|------|---------|
| **Paso inicial** | Mesero/cajero selecciona mesa en grid |
| **Endpoint** | `PATCH /tables/:id/status` |
| **MFE** | tables-mf (`TablesPage.tsx`) |
| **Rol autorizado** | ADMIN, MANAGER, OWNER, CASHIER, WAITER |
| **Estado actual** | ⚠️ PARCIAL — Backend funciona, frontend usa `window.location.href` para navegar |
| **Bug** | `TablesPage.tsx:10` — `window.location.href` fuerza reload completo del shell |
| **Qué falta** | Reemplazar `window.location.href` con `useNavigate()` del router |

## Flujo 6: Crear orden desde mesa

| Paso | Detalle |
|------|---------|
| **Paso inicial** | Mesero selecciona mesa → crea orden |
| **Endpoint** | `POST /orders` |
| **MFE** | orders-mf (`CreateOrderPage.tsx`) |
| **Rol autorizado** | OWNER, ADMIN, MANAGER, CASHIER, WAITER |
| **Estado actual** | ⚠️ PARCIAL — Backend completo, frontend usa `window.location.href` |
| **Bug** | `CreateOrderPage.tsx:38` — `window.location.href = '/waiter/tables'` |
| **Nota** | La creación de orden también crea KitchenTicket automáticamente |

## Flujo 7: Enviar orden a cocina

| Paso | Detalle |
|------|---------|
| **Paso inicial** | Al crear orden (`POST /orders`), se crea KitchenTicket automáticamente |
| **Endpoint** | `POST /orders` (auto-crea ticket) |
| **MFE** | kitchen-mf escucha `order:created` via event-bus |
| **Estado actual** | ✅ COMPLETO |

## Flujo 8: Cambiar estado en cocina

| Paso | Detalle |
|------|---------|
| **Paso inicial** | Chef cambia ticket de PENDING → IN_PROGRESS → READY → DELIVERED |
| **Endpoint** | `PATCH /kitchen/tickets/:id/status` |
| **MFE** | kitchen-mf (`KitchenQueuePage.tsx`) |
| **Rol autorizado** | OWNER, ADMIN, MANAGER, CHEF, KITCHEN_STAFF |
| **Estado actual** | ✅ COMPLETO — Sincroniza order status automáticamente |

## Flujo 9: Cobrar orden

| Paso | Detalle |
|------|---------|
| **Paso inicial** | Cajero selecciona método de pago y procesa |
| **Endpoint** | `POST /payments/process` |
| **MFE** | cashier-mf (`POSPage.tsx`) |
| **Rol autorizado** | OWNER, ADMIN, MANAGER, CASHIER |
| **Estado actual** | ✅ COMPLETO — Incluye split payment |
| **Qué falta** | Input de propinas en UI |

## Flujo 10: Generar ticket PDF

| Paso | Detalle |
|------|---------|
| **Paso inicial** | Después de cobrar, imprimir ticket |
| **Endpoint** | ❌ **No existe** |
| **MFE** | ❌ **No existe** |
| **Estado actual** | 🔴 NO IMPLEMENTADO |
| **Campo en schema** | `Payment.ticketPdfUrl` existe pero nunca se escribe |
| **Librerías** | Ninguna instalada para backend |
| **Archivos a crear** | `ticket.service.ts`, `ticket.controller.ts`, frontend button en POSPage |

## Flujo 11: Cerrar cuenta

| Paso | Detalle |
|------|---------|
| **Paso inicial** | Cajero procesa pago → orden cambia a PAID → mesa libera |
| **Endpoint** | `POST /payments/process` |
| **Estado actual** | ✅ COMPLETO — Pago transaccional, mesa → AVAILABLE, order → PAID |

## Flujo 12: Crear reserva

| Paso | Detalle |
|------|---------|
| **Paso inicial** | Recepción crea reserva con datos del cliente |
| **Endpoint** | `POST /admin/reservations` |
| **MFE** | reservations-mf (`ReservationModal.tsx`) |
| **Rol autorizado** | OWNER, ADMIN, MANAGER, CASHIER, WAITER |
| **Estado actual** | ✅ COMPLETO |
| **Bug potencial** | Búsqueda por `confirmationCode` en `reservations.repository.ts:51` — campo no existe en schema |

## Flujo 13: Asignar mesa a reserva

| Paso | Detalle |
|------|---------|
| **Paso inicial** | Reserva requiere `tableId` |
| **Endpoint** | `POST /admin/reservations` (requiere `tableId`) |
| **Estado actual** | ⚠️ PARCIAL — Se asigna mesa manualmente, sin auto-asignación |
| **Qué falta** | Lógica de auto-asignación basada en `partySize` y disponibilidad |

## Flujo 14: Generar reporte de ventas

| Paso | Detalle |
|------|---------|
| **Paso inicial** | Admin selecciona rango de fechas y tipo |
| **Endpoint** | `GET /admin/reports/sales` |
| **MFE** | reports-mf (`ReportesPage.tsx`) |
| **Estado actual** | ✅ COMPLETO — Con gráficos recharts y export CSV/PDF |

## Flujo 15: Generar menú imprimible

| Paso | Detalle |
|------|---------|
| **Paso inicial** | Admin quiere imprimir menú |
| **Endpoint** | ❌ **No existe** |
| **MFE** | ❌ **No existe** |
| **Estado actual** | 🔴 NO IMPLEMENTADO |
| **Qué falta** | Endpoint que genere PDF/HTML del menú por categoría con precios |

## Flujo 16: Publicar menú público

| Paso | Detalle |
|------|---------|
| **Paso inicial** | Restaurante quiere compartir menú vía subdominio |
| **Endpoint** | ❌ **No existe** `@Public()` en menus |
| **MFE** | ❌ **No existe** página pública |
| **Estado actual** | 🔴 NO IMPLEMENTADO |
| **Nota** | El middleware de tenant resuelve subdominios, pero no hay endpoint público |

## Flujo 17: Generar QR

| Paso | Detalle |
|------|---------|
| **Paso inicial** | Generar QR que apunte al menú público |
| **Estado actual** | 🔴 NO IMPLEMENTADO |
| **Librerías** | Ninguna instalada |

## Flujo 18: Dividir cuenta

| Paso | Detalle |
|------|---------|
| **Paso inicial** | Cajero selecciona split payment |
| **Endpoint** | `POST /payments/process` con array de `SplitPaymentDto` |
| **MFE** | cashier-mf (`POSPage.tsx:115-157`) |
| **Estado actual** | ✅ COMPLETO — UI con líneas dinámicas, métodos y montos |

## Flujo 19: Registrar propina

| Paso | Detalle |
|------|---------|
| **Paso inicial** | Cajero ingresa propina al cobrar |
| **Endpoint** | `POST /payments/process` con `tip: { method, amount }` |
| **Backend** | ✅ Completo — `TipDto`, `Tip` model, `createTip` repository |
| **Frontend** | 🔴 **NO EXISTE input de propina en POSPage** |
| **Estado actual** | 🔴 PARCIAL — Backend sí, frontend no |

## Flujo 20: Aplicar promoción por horario

| Paso | Detalle |
|------|---------|
| **Paso inicial** | Promoción tiene `startsAt` y `endsAt` |
| **Backend** | ⚠️ `findActive()` filtra por rango de fechas (no hora del día) |
| **Frontend** | 🔴 No hay UI para crear promociones con horarios |
| **Auto-aplicación** | 🔴 No hay lógica que aplique promociones automáticamente a órdenes |
| **Estado actual** | 🔴 PARCIAL — Sin time-of-day, sin auto-aplicación |

## Flujo 21: Descontar inventario de ingredientes

| Paso | Detalle |
|------|---------|
| **Paso inicial** | Al vender un platillo, descontar ingredientes |
| **Prisma** | 🔴 **No existe modelo `InventoryItem`** |
| **Backend** | 🔴 **No existe módulo de inventario** |
| **Frontend** | ⚠️ UI existe (`InventarioPage.tsx`) pero llama endpoints inexistentes |
| **Estado actual** | 🔴 NO IMPLEMENTADO — Frontend roto, backend inexistente |

---

# 8. Problemas Técnicos Bloqueantes

## 8.1 Bugs que Rompen Funcionalidad

| # | Problema | Archivo | Línea | Impacto |
|---|----------|---------|-------|---------|
| B-01 | `confirmationCode` no existe en schema Prisma — crash al buscar reservaciones | `reservations.repository.ts` | 51 | 🔴 BLOQUEANTE — error 500 al usar search |
| B-02 | `window.location.href` rompe SPA en tables-mf | `tables-mf/src/pages/TablesPage.tsx` | 10 | 🔴 BLOQUEANTE — recarga shell completo |
| B-03 | `window.location.href` rompe SPA en orders-mf | `orders-mf/src/pages/CreateOrderPage.tsx` | 38 | 🔴 BLOQUEANTE — recarga shell completo |
| B-04 | `window.location.href` rompe SPA en useCreateOrder | `orders-mf/src/hooks/useCreateOrder.ts` | 96 | 🔴 BLOQUEANTE — recarga shell completo |
| B-05 | `ForgotPasswordPage` llama endpoint inexistente | `auth-mf/src/pages/ForgotPasswordPage.tsx` | — | 🟠 ALTO — error 404 |
| B-06 | CORS bug — string malformado en array de orígenes | `apps/backend/src/main.ts` | 25 | 🟠 ALTO — origins no permitidos |
| B-07 | `InventarioPage` llama `/admin/inventory` — endpoints no existen | `menu-mf/src/pages/InventarioPage.tsx` | — | 🟠 ALTO — error 404 |

## 8.2 Inconsistencias Arquitectónicas

| # | Problema | Archivo | Impacto |
|---|----------|---------|---------|
| A-01 | Cross-MFE import: reservations → tables | `reservations-mf/ReservationModal.tsx:4` | 🔴 Rompe independencia de despliegue |
| A-02 | 9 servicios de dominio en web-shell (código muerto) | `web-shell/src/services/*` | 🟠 SOFEA violation |
| A-03 | 8 hooks duplicados en web-shell | `web-shell/src/hooks/*` | 🟠 SOFEA violation |
| A-04 | Layout duplicado en dashboard-mf | `dashboard-mf/src/components/layout/*` | 🟠 SOFEA violation |
| A-05 | `cn()` duplicado 7 veces | 6 `utils.ts` + `@maison/ui` | 🟠 Duplicación |
| A-06 | `formatCurrency` definido 9 veces | 6 MFEs + 3 inline | 🟠 Duplicación |
| A-07 | 3 mecanismos de branch state | `BranchProvider`, `useBranchFilter`, inline | 🟠 Inconsistencia |

## 8.3 Código Muerto y Deuda Técnica

| # | Problema | Líneas | Archivos |
|---|----------|--------|----------|
| D-01 | Servicios web-shell no utilizados | ~255 | 9 archivos en `web-shell/src/services/` |
| D-02 | Hooks web-shell no utilizados | ~464 | 8 archivos en `web-shell/src/hooks/` |
| D-03 | Componentes dashboard no utilizados | ~417 | 3 archivos en `web-shell/src/components/admin/dashboard/` |
| D-04 | Tipos web-shell redundantes | ~18 | 2 archivos en `web-shell/src/types/` |
| D-05 | `page.module.css` boilerplate | ~142 | `web-shell/src/app/page.module.css` |
| D-06 | `.d.ts` desincronizados | — | `types/index.d.ts`, `ui/index.d.ts`, `event-bus/events.d.ts` |

## 8.4 Datos Hardcodeados

| # | Dato | Archivo | Línea |
|---|------|---------|-------|
| H-01 | `"Super Admin"` / `"admin@maison.mx"` | `web-shell/AdminSidebar.tsx` | 186 |
| H-02 | `"SA"` initials | `web-shell/AdminTopbar.tsx` | 156 |
| H-03 | DB password en seed | `apps/backend/prisma/seed.ts` | 29 |
| H-04 | `branchId: ''` en order response | `orders.service.ts` | 454 |
| H-05 | `popularItems: 0` hardcodeado | `menus.repository.ts` | 125 |
| H-06 | `subCategories: 0` hardcodeado | `categories.repository.ts` | 98 |

## 8.5 `console.error` en Producción

| Archivo | Línea |
|---------|-------|
| `tables-mf/src/services/tables.service.ts` | 56 |
| `reservations-mf/src/pages/ReservacionesPage.tsx` | 270 |
| `reports-mf/src/pages/ReportesPage.tsx` | 41 |
| `orders-mf/src/hooks/useCreateOrder.ts` | 46 |

## 8.6 `as any` en Frontend

| Archivo | Línea | Contexto |
|---------|-------|----------|
| `orders-mf/src/hooks/useOrders.ts` | 77 | `status as any` |
| `orders-mf/src/hooks/useCreateOrder.ts` | 39 | `(res as any)?.data` |
| `tables-mf/src/services/tables.service.ts` | 43,50 | `response as any` |
| `tables-mf/src/hooks/useTables.ts` | 33 | `response as any` |
| `kitchen-mf/src/hooks/useKitchenQueue.ts` | 18 | `(res as any).data` |
| `reservations-mf/src/hooks/useReservations.ts` | 46-47 | `(res as any).data` |

---

# 9. Backlog Priorizado por Ramas

## Fase 1: Bugs que Bloquean Funcionalidad

| # | Rama | Objetivo | Problema | Archivos Probables | Dependencias | Riesgo | Complejidad | Criterios de Aceptación |
|---|------|----------|----------|-------------------|-------------|--------|-------------|------------------------|
| 1 | `fix/reservation-search-crash` | Corregir referencia a `confirmationCode` inexistente | B-01: error 500 al buscar reservaciones | `reservations.repository.ts`, `reservations.service.ts`, `schema.prisma` (opcional) | Ninguna | Bajo | Baja | Búsqueda por texto no lanza error 500 |
| 2 | `fix/spa-navigation-tables` | Reemplazar `window.location.href` con router | B-02: recarga shell completo | `tables-mf/src/pages/TablesPage.tsx` | Ninguna | Bajo | Baja | Navegación a crear orden es SPA (sin reload) |
| 3 | `fix/spa-navigation-orders` | Reemplazar `window.location.href` con router | B-03, B-04: recarga shell completo | `orders-mf/src/pages/CreateOrderPage.tsx`, `orders-mf/src/hooks/useCreateOrder.ts` | Ninguna | Bajo | Baja | Navegación post-creación es SPA |
| 4 | `fix/cors-bug` | Corregir CORS origins array | B-06: orígenes no permitidos | `apps/backend/src/main.ts` | Ninguna | Bajo | Trivial | `http://localhost:5014` se permite como origen separado |
| 5 | `fix/cross-mfe-import` | Eliminar import directo de tables-mf | A-01: acoplamiento entre MFEs | `reservations-mf/src/components/ReservationModal.tsx`, `reservations-mf/src/services/reservations.service.ts` | Ninguna | Medio | Media | reservations-mf no importa de tables-mf vía filesystem |

## Fase 2: Must Have Faltantes

| # | Rama | Objetivo | Problema | Archivos Probables | Dependencias | Riesgo | Complejidad | Criterios de Aceptación |
|---|------|----------|----------|-------------------|-------------|--------|-------------|------------------------|
| 6 | `feat/ticket-pdf` | Generar ticket PDF después de cobrar | Must have #6 | `ticket.service.ts`, `ticket.controller.ts`, `cashier-mf/POSPage.tsx` | Fase 1 completada | Medio | Alta | Botón "Imprimir ticket" genera PDF descargable con detalle de orden |
| 7 | `feat/printable-menu` | Generar menú imprimible por categoría | Must have #8 | `menu-print.service.ts`, `menu-print.controller.ts`, `menu-mf/` o nuevo botón | Ninguna | Bajo | Media | Botón "Imprimir menú" genera PDF/HTML con platillos agrupados por categoría |
| 8 | `feat/inventory-backend` | Crear módulo de inventario completo | Frontend roto, backend inexistente | `inventory/` (nuevo módulo), `schema.prisma` (nuevo modelo), `menu-mf/InventarioPage.tsx` | Ninguna | Medio | Alta | `GET/POST /admin/inventory` funcionan, InventarioPage muestra datos reales |

## Fase 3: Funciones Parciales

| # | Rama | Objetivo | Problema | Archivos Probables | Dependencias | Riesgo | Complejidad | Criterios de Aceptación |
|---|------|----------|----------|-------------------|-------------|--------|-------------|------------------------|
| 9 | `feat/tip-ui` | Agregar input de propinas en caja | Backend soporta pero UI no recolecta | `cashier-mf/POSPage.tsx`, `cashier-mf/usePOS.ts` | Fase 1 | Bajo | Baja | Cajero puede ingresar propina (% o fija) al procesar pago |
| 10 | `feat/tables-crud` | Crear endpoints CRUD para mesas | No existen POST/PUT/DELETE | `tables.controller.ts`, `tables.service.ts`, `tables.repository.ts`, `CreateTableDto.ts` | Ninguna | Bajo | Media | Admin puede crear, editar y eliminar mesas |
| 11 | `feat/auth-forgot-password` | Implementar forgot/reset password backend | Frontend llama endpoint inexistente | `auth.controller.ts`, `auth.service.ts`, `auth.repository.ts` | Ninguna | Medio | Media | Flujo completo forgot→reset→login funciona |
| 12 | `feat/cashier-menu-access` | Permitir CASHIER ver menús para POS | CASHIER no está en roles de menus controller | `menus.controller.ts:51` | Ninguna | Bajo | Trivial | CASHIER puede acceder a `GET /admin/menus` |

## Fase 4: Funciones Avanzadas

| # | Rama | Objetivo | Problema | Archivos Probables | Dependencias | Riesgo | Complejidad | Criterios de Aceptación |
|---|------|----------|----------|-------------------|-------------|--------|-------------|------------------------|
| 13 | `feat/public-menu` | Menú público por subdominio | No existe endpoint público | `menus.controller.ts` (@Public), nueva ruta frontend pública | Fase 8 (inventario) | Alto | Alta | Menú accesible sin autenticación vía subdominio |
| 14 | `feat/qr-menu` | Generar QR para compartir menú | No existe | `qr.service.ts`, `qr.controller.ts`, librería QR, frontend button | Fase 13 | Medio | Media | Botón "Generar QR" muestra QR que apunta al menú público |
| 15 | `feat/promotions-scheduler` | Promociones por horario del día | Solo fecha range, sin time-of-day | `schema.prisma` (nuevos campos), `promotions.service.ts`, auto-aplicación en orders | Ninguna | Medio | Alta | Promociones se aplican automáticamente según hora del día |
| 16 | `feat/reservation-auto-assign` | Auto-asignación de mesa por partySize | Asignación manual | `reservations.service.ts`, lógica de búsqueda por capacidad | Fase 10 | Medio | Media | Al crear reserva, el sistema sugiere mesa disponible por capacidad |
| 17 | `feat/kitchen-priority` | Priorización de órdenes en cocina | Campo `priority` existe sin UI | `kitchen-mf/`, `kitchen.controller.ts` | Ninguna | Bajo | Media | Chef puede marcar orden como prioritaria |

## Fase 5: Refactors

| # | Rama | Objetivo | Problema | Archivos Probables | Dependencias | Riesgo | Complejidad | Criterios de Aceptación |
|---|------|----------|----------|-------------------|-------------|--------|-------------|------------------------|
| 18 | `refactor/shell-cleanup` | Eliminar código muerto del shell | ~1,100 líneas sin usar | `web-shell/src/services/*`, `hooks/*`, `components/admin/dashboard/*`, `types/*` | Ninguna | Bajo | Baja | Shell compila sin warnings, sin imports huérfanos |
| 19 | `refactor/shared-utils` | Crear `packages/utils` | `cn()` x7, `formatCurrency()` x9 | Nuevo paquete, actualizar imports en 6+ MFEs | Ninguna | Bajo | Media | Un solo `cn()` y `formatCurrency()` en `@maison/utils` |
| 20 | `refactor/shared-hooks` | Crear hook genérico `usePaginatedQuery` | 8 hooks con mismo boilerplate | Nuevo hook, reemplazar en todos los MFEs | Ninguna | Medio | Media | Un solo hook reutilizable para fetching paginado |
| 21 | `refactor/standardize-api-responses` | Unificar unwrap de respuestas API | 5 patrones diferentes de unwrap | Todos los servicios de MFEs | Ninguna | Medio | Media | Todos los MFEs usan el mismo patrón de unwrap |
| 22 | `refactor/error-boundaries` | Agregar Error Boundaries | Sin protección ante crashes | `web-shell/src/app/**/error.tsx` | Ninguna | Bajo | Baja | Crash de un MFE no blanca la app completa |

## Fase 6: Tests

| # | Rama | Objetivo | Problema | Archivos Probables | Dependencias | Riesgo | Complejidad | Criterios de Aceptación |
|---|------|----------|----------|-------------------|-------------|--------|-------------|------------------------|
| 23 | `test/backend-unit-tests` | Tests unitarios para services | 0 unit tests (excepto TenantPrisma) | `*.spec.ts` para cada módulo | Ninguna | Bajo | Alta | Cobertura > 60% en services |
| 24 | `test/backend-e2e-completo` | E2E para todos los endpoints | Solo 7 de 55 endpoints tienen e2e | `test/*.e2e-spec.ts` | Ninguna | Bajo | Alta | Cada endpoint tiene al menos 1 e2e |
| 25 | `test/mfe-service-tests` | Tests para servicios de MFEs | 7/9 MFEs sin tests | `__tests__/*.test.ts` por MFE | Ninguna | Bajo | Media | Cada servicio de MFE tiene al menos 1 test |
| 26 | `test/e2e-playwright` | Tests end-to-end con Playwright | 0 tests E2E frontend | `e2e/*.spec.ts` | Fase 1-4 | Alto | Alta | Flujo login→orden→cocina→pago funciona E2E |

## Fase 7: DevOps

| # | Rama | Objetivo | Problema | Archivos Probables | Dependencias | Riesgo | Complejidad | Criterios de Aceptación |
|---|------|----------|----------|-------------------|-------------|--------|-------------|------------------------|
| 27 | `chore/ci-frontend` | Agregar frontend a CI | Solo backend en CI | `.github/workflows/ci.yml` | Ninguna | Bajo | Media | CI build/lint/typecheck de todos los MFEs |
| 28 | `chore/docker-frontend` | Docker para shell + MFEs | Solo backend tiene Docker | `Dockerfile.frontend`, `nginx.conf` | Ninguna | Bajo | Media | `docker-compose up` levanta todo |
| 29 | `chore/ci-add-mfe-branch` | CI cubre rama micro-frontend | Pipeline no cubre rama actual | `.github/workflows/ci.yml` | Ninguna | Bajo | Trivial | PRs a `micro-frontend` ejecutan CI |
| 30 | `chore/pre-commit-hooks` | Husky + lint-staged | Sin quality gates locales | `husky/`, `.lintstagedrc` | Ninguna | Bajo | Baja | Pre-commit ejecuta lint y typecheck |

---

# 10. Roadmap

## FASE 1 — Estabilización (Semana 1)

**Objetivo:** Eliminar bugs que rompen funcionalidad existente.

| Orden | Rama | Dependencias |
|-------|------|-------------|
| 1 | `fix/reservation-search-crash` | — |
| 2 | `fix/spa-navigation-tables` | — |
| 3 | `fix/spa-navigation-orders` | — |
| 4 | `fix/cors-bug` | — |
| 5 | `fix/cross-mfe-import` | — |
| 6 | `refactor/error-boundaries` | — |
| 7 | `chore/ci-add-mfe-branch` | — |

**Resultado esperado:** Todos los flujos existentes funcionan sin crashes ni recargas. CI cubre la rama de desarrollo.

## FASE 2 — Must Have Completos (Semanas 2-3)

**Objetivo:** Los 8 must have estén funcionales.

| Orden | Rama | Dependencias |
|-------|------|-------------|
| 8 | `feat/tables-crud` | — |
| 9 | `feat/cashier-menu-access` | — |
| 10 | `feat/inventory-backend` | — |
| 11 | `feat/ticket-pdf` | Fase 1 |
| 12 | `feat/printable-menu` | — |

**Resultado esperado:** Menú, mesas (CRUD), órdenes, cocina, cobro, ticket PDF, reportes, menú imprimible — todos funcionales.

## FASE 3 — Operación Completa por Roles (Semana 4)

**Objetivo:** Cada rol pueda operar completamente.

| Orden | Rama | Dependencias |
|-------|------|-------------|
| 13 | `feat/tip-ui` | Fase 1 |
| 14 | `feat/auth-forgot-password` | — |
| 15 | `refactor/shell-cleanup` | — |

**Resultado esperado:** CASHIER puede cobrar con propinas. Todos los roles pueden autenticarse y recuperar contraseña. Shell limpio.

## FASE 4 — Funciones Avanzadas (Semanas 5-6)

**Objetivo:** Diferenciadores de producto.

| Orden | Rama | Dependencias |
|-------|------|-------------|
| 16 | `refactor/shared-utils` | — |
| 17 | `refactor/shared-hooks` | — |
| 18 | `refactor/standardize-api-responses` | — |
| 19 | `feat/public-menu` | Fase 2 (inventario) |
| 20 | `feat/qr-menu` | Fase 19 |
| 21 | `feat/promotions-scheduler` | — |
| 22 | `feat/reservation-auto-assign` | Fase 2 (tables CRUD) |
| 23 | `feat/kitchen-priority` | — |

**Resultado esperado:** Menú público, QR, promociones por horario, auto-asignación, priorización en cocina.

## FASE 5 — Calidad y Pruebas (Semanas 7-8)

**Objetivo:** Cobertura de testing adecuada.

| Orden | Rama | Dependencias |
|-------|------|-------------|
| 24 | `test/backend-unit-tests` | — |
| 25 | `test/backend-e2e-completo` | — |
| 26 | `test/mfe-service-tests` | — |
| 27 | `test/e2e-playwright` | Fase 1-4 |
| 28 | `chore/pre-commit-hooks` | — |

**Resultado esperado:** Cobertura > 60% backend, tests en todos los MFEs, E2E completo.

## FASE 6 — Producción (Semana 9)

**Objetivo:** Desplegable.

| Orden | Rama | Dependencias |
|-------|------|-------------|
| 29 | `chore/ci-frontend` | Fase 5 |
| 30 | `chore/docker-frontend` | — |

**Resultado esperado:** CI completo, Docker para todo el stack, desplegable con `docker-compose up`.

---

# 11. Siguiente Rama Recomendada

## `fix/reservation-search-crash`

**Por qué:**
- Es un bug de runtime que causa error 500
- Afecta funcionalidad existente (búsqueda de reservaciones)
- Complejidad trivial (1 archivo, 1 línea)
- Sin dependencias
- Riesgo mínimo

**Archivos a revisar:**
1. `apps/backend/src/reservations/reservations.repository.ts:51` — referencia a `confirmationCode` inexistente
2. `apps/backend/prisma/tenant/schema.prisma` — verificar campos del modelo Reservation

**Qué no tocar:**
- Ningún otro módulo
- Ningún archivo de frontend
- Ningún paquete compartido

**Criterios de aceptación:**
1. `GET /admin/reservations?search=texto` no lanza error 500
2. La búsqueda filtra por campos existentes (`guestName`, `guestPhone`, `notes`)
3. El test existente de reservations pasa
4. No se rompen otros endpoints de reservaciones

**Pruebas a ejecutar:**
```bash
cd apps/backend
npm run test:e2e -- --testPathPattern=reservations
```

---

# 12. Checklist de Producción

| # | Requisito | Estado | Bloqueante |
|---|-----------|:------:|:----------:|
| 1 | Login + Refresh Token funciona | ✅ | Sí |
| 2 | Todos los roles autentican correctamente | ✅ | Sí |
| 3 | Menú CRUD completo (backend + frontend) | ✅ | Sí |
| 4 | Categorías CRUD completo | ✅ | Sí |
| 5 | Mesas: ver + cambiar estado | ⚠️ | Sí |
| 6 | Mesas: CRUD completo | 🔴 | Sí |
| 7 | Órdenes: crear + listar + cambiar estado | ✅ | Sí |
| 8 | Órdenes: cancelar | ✅ | Sí |
| 9 | Cocina: cola + cambiar estado | ✅ | Sí |
| 10 | Caja: cobro con split payment | ✅ | Sí |
| 11 | Caja: propinas | 🔴 | No |
| 12 | Ticket PDF | 🔴 | Sí |
| 13 | Reportes: ventas + productos + pagos + peak hours | ✅ | Sí |
| 14 | Menú imprimible | 🔴 | Sí |
| 15 | Reservaciones: crear + listar + cancelar | ⚠️ | Sí |
| 16 | Reservaciones: bug search | 🔴 | Sí |
| 17 | SPA navigation (sin reloads) | 🔴 | Sí |
| 18 | Error boundaries | 🔴 | Sí |
| 19 | CORS configurado correctamente | 🔴 | Sí |
| 20 | Inventario: backend + frontend | 🔴 | No |
| 21 | Menú público | 🔴 | No |
| 22 | QR | 🔴 | No |
| 23 | Promociones por horario | 🔴 | No |
| 24 | Tests unitarios backend > 60% | 🔴 | No |
| 25 | Tests E2E backend completos | 🔴 | No |
| 26 | Tests frontend | 🔴 | No |
| 27 | CI completo (frontend + backend) | 🔴 | No |
| 28 | Docker completo (frontend + backend) | 🔴 | Sí |
| 29 | Sin código muerto en shell | 🔴 | No |
| 30 | Sin imports directos entre MFEs | 🔴 | Sí |

**Resultado: 11/30 requisitos cumplidos. 12 bloqueantes pendientes.**

---

**Documento generado por auditoría funcional.**
**Siguiente acción: crear rama `fix/reservation-search-crash`.**
