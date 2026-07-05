# ARCHITECTURE REVIEW — AuraRest Multitenant

---

## 1. Veredicto ejecutivo

1. La arquitectura es **correcta en concepto pero sobreingenierizada en ejecución**: 9 MFEs para un dominio que necesita 4-5, duplicación masiva de tipos, servicios y contextos.
2. El backend NestJS está **bien estructurado**: Controller/Service/Repository con separación limpia y multitenencia por schema de PostgreSQL correctamente implementada.
3. El **peor problema es la duplicación de tipos**: `web-shell/src/types/` (8 archivos) duplica casi idénticamente `@maison/types` (697 líneas).
4. **tables-mf debe eliminarse**: puerto conflictivo (5004 = orders-mf), no está integrado en shell, tiene typo (`TablesPagee`), duplica ruta `/orders`.
5. **apps/frontend/ debe eliminarse**: solo contiene `node_modules/`, sin código fuente.
6. No existe **caché, WebSocket, cola de mensajes, health check, ni tests** significativos.
7. La **multitenencia por schema** es la decisión correcta, pero la implementación actual del `TenantPrismaService` (Map sin TTL) escalará mal.
8. El **Event Bus** (`@maison/event-bus`) con CustomEvent en `window` es simple y correcto para el alcance actual.
9. El **Repository Pattern** está justificado: hace bcrypt, cross-entity ops, slug generation, field omission. No es ruido.
10. **AuthService** rompe el patrón al usar Prisma directamente sin repository — inconsistencia menor pero documentable.
11. **Faltan ADRs, reglas de arquitectura lint, contratos OpenAPI, testing infrastructure y observabilidad**.
12. Los **guards (JwtAuthGuard, RolesGuard, TenantGuard)** están bien diseñados y correctamente encadenados.
13. La **separación frontend/backend por tenant** (schema por tenant) es escalable hasta ~100 tenants, luego requerirá pooling optimizado.
14. El **shell con Next.js + MFEs con Vite + Module Federation** es una combinación válida pero frágil (los hacks `bridgeSharedModules` y `installViteReactPreamble` lo demuestran).
15. **Sin CI/CD, sin Docker, sin infraestructura como código** — esto bloquea cualquier despliegue real.

---

## 2. Architecture Score

| Dimensión | Score | Justificación |
|-----------|-------|---------------|
| **Architecture Score** | **68/100** | Buena base, sobreingeniería en MFEs, duplicación masiva, falta infraestructura transversal |
| **Maintainability Score** | **55/100** | Duplicación de tipos/servicios/contextos dificulta cambios; faltan tests y lint arquitectónico |
| **Scalability Score** | **48/100** | Sin caché, sin colas, sin WebSocket, sin pooling optimizado; schema-per-tenant sin gestión de conexiones |
| **Security Architecture Score** | **62/100** | JWT+bcrypt bien; falta rate limiting, audit logging, IP whitelist, security headers |
| **Frontend Architecture Score** | **58/100** | Shell+MFE correcto; duplicación masiva de tipos, BranchContext repetido 6 veces, tables-mf es basura |
| **Backend Architecture Score** | **72/100** | NestJS bien estructurado, Repository Pattern justificado, Auth bypass es la única inconsistencia mayor |

---

## 3. Lo mejor de la arquitectura

| Elemento | Archivo | Motivo |
|----------|---------|--------|
| Schema-per-tenant multitenancy | `prisma/system/schema.prisma` + `prisma/tenant/schema.prisma` | Aislamiento real de datos por tenant, sin riesgo de cross-contamination |
| TenantPrismaService con cacheo | `apps/backend/src/database/tenant-prisma.service.ts:11-28` | Evita crear PrismaClient por request; patrón correcto |
| TenantMiddleware 3-strategy | `apps/backend/src/common/middleware/tenant.middleware.ts:22-52` | Resolución por JWT, header o subdominio — flexible y completa |
| Guards chain | `apps/backend/src/app.module.ts:50-53` + `common/guards/*` | JWT → Roles → Tenant en orden correcto con @Public() para excepciones |
| Repository Pattern con valor real | `apps/backend/src/users/users.repository.ts:47-49` (bcrypt), `branches/branches.repository.ts:36-40` (slug) | No es passthrough; agrega lógica transversal |
| Event Bus compartido | `packages/event-bus/src/bus.ts` | CustomEvent en window con namespacing `maison:*` — simple, sin dependencias, suficiente para el alcance |
| Shared packages (`@maison/*`) | `packages/types`, `packages/api-client`, `packages/auth-client`, `packages/ui`, `packages/event-bus` | Separación correcta de preocupaciones compartidas |
| Swagger setup | `apps/backend/src/main.ts:24-33` | Bearer JWT + x-tenant-slug documentados |
| Global ValidationPipe | `apps/backend/src/main.ts:11-17` | whitelist + forbidNonWhitelisted + transform — configuración correcta |

---

## 4. Lo peor de la arquitectura

| Elemento | Archivo | Motivo |
|----------|---------|--------|
| Duplicación masiva de tipos | `apps/web-shell/src/types/*.ts` (8 archivos) vs `packages/types/src/index.ts` | 7 de 8 archivos son copias casi idénticas; el shell importa tipos locales, los MFEs importan `@maison/types` |
| Duplicación de BranchContext | `apps/web-shell/src/context/BranchContext.tsx` + 5 MFEs con copia | Lógica idéntica, tipo import diferente, riesgo de drift |
| Duplicación de servicios | `apps/web-shell/src/services/*.ts` vs `apps/dashboard-mf/src/services/*.ts` | Mismos endpoints, diferente estilo, diferentes tipos |
| tables-mf existe y está roto | `apps/tables-mf/` | Puerto 5004 conflictivo con orders-mf, typo `TablesPagee`, no integrado en shell, sin ruta, duplica `/orders` |
| apps/frontend/ existe vacío | `apps/frontend/` | Solo node_modules, sin código fuente, legacy |
| Module Federation hacks | `apps/web-shell/src/lib/federation.ts:12-17,30-36` | `bridgeSharedModules()` y `installViteReactPreamble()` indican que Next.js + Vite MFE no es una combinación madura |
| Sin caché distribuido | NO EXISTE | Sin Redis, sin cache-manager, sin node-cache; el único cacheo es el Map de PrismaClient |
| Sin WebSocket | NO EXISTE | Cocina, ordenes en tiempo real, notificaciones — todo requiere polling |
| Sin cola de mensajes | NO EXISTE | Pagos concurrentes, procesos pesados, reportes — todo es síncrono |
| Sin health checks | NO EXISTE | Sin `@nestjs/terminus`, sin endpoint `/health` |
| Sin tests | `apps/backend/test/app.e2e-spec.ts` + `apps/backend/src/app.controller.spec.ts` | Solo 2 tests triviales del boilerplate inicial |

---

## 5. Sobreingeniería detectada

| Elemento | Archivo | Problema |
|----------|---------|----------|
| 9 MFEs para un SaaS de restaurantes | `apps/*-mf/` | El dominio necesita 4-5 MFEs máximo (auth, dashboard, orders/kitchen/cashier, reports, reservations). Menu-mf y tables-mf sobran como MFEs independientes. |
| tables-mf como MFE separado | `apps/tables-mf/` | La gestión de mesas debería ser parte de dashboard-mf o orders-mf, no un MFE independiente. 0 valor como remoto separado. |
| BranchContext en cada MFE | 6 copias | El BranchContext debería vivir en `@maison/ui` o ser inyectado por el shell via props. 6 implementaciones idénticas es ruido. |
| 8 services en web-shell + duplicados en dashboard-mf | `apps/web-shell/src/services/` + `apps/dashboard-mf/src/services/` | Los servicios de API deberían estar en `@maison/api-client` o un `@maison/services`, no copiados en cada app. |
| 8 type files en web-shell duplicando @maison/types | `apps/web-shell/src/types/` | El shell debería usar `@maison/types` directamente. Los 2 tipos extra (`StatCardConfig`, `AdminProfile`) no justifican 8 archivos. |
| ReportsModule, DiscountsModule, PromotionsModule como módulos separados | `apps/backend/src/reports/`, `discounts/`, `promotions/` | ReportsModule está bien. Discounts y Promotions podrían ser un solo módulo `pricing`. |

---

## 6. Complejidad accidental

| Complejidad | Causa | Solución |
|-------------|-------|----------|
| Dos fuentes de verdad para tipos | web-shell usa `@/types/*`, MFEs usan `@maison/types` | Unificar todo en `@maison/types`, eliminar `apps/web-shell/src/types/` |
| Dos implementaciones de BranchContext | web-shell y dashboard-mf tienen su propia versión con imports diferentes | Mover BranchContext a `@maison/ui` y compartirlo como singleton de Module Federation |
| Port conflict detection manual | `tables-mf` usa puerto 5004 igual que `orders-mf` sin advertencia | Asignación centralizada de puertos en workspace o script de validación |
| Hacks de federación | `bridgeSharedModules` y `installViteReactPreamble` | Solucionable usando el mismo empaquetador (Vite para todo o Next para todo) |
| `apps/frontend/` huérfano | Directorio con solo node_modules | Eliminar |
| `docs/`, `infra/`, `scripts/` vacíos | 3 directorios sin contenido | Eliminar o poblar |

---

## 7. Violaciones arquitectónicas

| Violación | Archivo | Línea | Descripción |
|-----------|---------|-------|-------------|
| AuthService bypass del Repository pattern | `apps/backend/src/auth/auth.service.ts` | 18-20 | Usa `TenantPrismaService.getClient()` directamente en vez de un AuthRepository. Inconsistencia con el resto del backend. |
| ReservationsRepository parámetros inconsistentes | `apps/backend/src/reservations/reservations.repository.ts` | 13, 32, 65, 72 | Los métodos reciben `(data, schema)` en vez de `(schema, data)` como el resto. |
| Shell depende de tipos locales en vez de shared | `apps/web-shell/src/context/BranchContext.tsx` | 4 | Importa `@/types/branch.types` en vez de `@maison/types`. |
| Dashboard-mf BranchContext sin 'use client' | `apps/dashboard-mf/src/context/BranchContext.tsx` | 1 | Mientras que el shell sí lo tiene. Inconsistencia que causará bugs en Server Components. |
| tables-mf expone componente con typo | `apps/tables-mf/src/App.tsx` | 10 | `TablesPagee` (doble 'e'). Indica falta de code review. |
| Sin separación de responsabilidades en Discounts/Promotions | `apps/backend/src/discounts/` + `promotions/` | - | Dos módulos casi idénticos que podrían fusionarse. |
| packages/api-client depende de `import.meta.env` | `packages/api-client/src/client.ts` | 4 | `import.meta.env.VITE_API_URL` — esto hace que el paquete solo funcione en entorno Vite, no en Next.js (shell). El shell usa variables de entorno de Next.js. |

---

## 8. Clean Architecture Review

### Capas que existen realmente

Backend:
1. **Controllers** (`apps/backend/src/*/controllers/`) — HTTP transport
2. **Services** (`apps/backend/src/*/services/`) — Business logic
3. **Repositories** (`apps/backend/src/*/repositories/`) — Data access abstraction
4. **Prisma Generated** (`apps/backend/src/generated/`) — Infrastructure/ORM

Frontend:
1. **Shell** (`apps/web-shell/`) — Host, routing, auth gate
2. **MFEs** (`apps/*-mf/`) — Domain UIs
3. **Shared Packages** (`packages/*`) — Cross-cutting concerns

### Capas bien separadas
- Controllers no tienen lógica de negocio — solo extraen parámetros y delegan.
- Repositories no tienen lógica de negocio — solo construyen queries.
- Shared packages no dependen de apps específicas — dependencia unidireccional.

### Capas acopladas
- **AuthService** (lógica de negocio) con **PrismaService** (infraestructura) directamente — violación de Dependency Inversion.
- **packages/api-client** está acoplado a Vite (`import.meta.env`) pero se usa desde Next.js shell.
- **Event Bus** backend (`EventBusService`) y frontend (`@maison/event-bus`) son independientes entre sí pero tienen nombres/eventos duplicados — riesgo de drift.

### Capas que sobran
- **tables-mf** como MFE completo — sobra.
- **apps/frontend/** — directorio vacío, sobra.
- **DiscountsModule** y **PromotionsModule** separados — podrían fusionarse.

### Dependencias en dirección incorrecta
- **Shell → tipos locales** en vez de shell → shared types. La dependencia debería ser web-shell → `@maison/types`, no web-shell → `@/types/*`.
- **dashboard-mf/services/** duplica servicios que deberían estar en web-shell o en un shared package — la dependencia debería ser dashboard-mf → web-shell (o shared), no dashboard-mf → su propia copia.

---

## 9. DDD Review

### Dominios reales vs carpetas por feature

**Backend:**
- **Dominios reales**: `Tenant`, `Branch`, `User`, `Order`, `Payment`, `Menu`, `Reservation` — tienen lógica de negocio, reglas y eventos.
- **Solo carpetas sin dominio real**: `Discounts`, `Promotions` (son CRUD sin lógica de negocio significativa), `Reports` (es read-model/query, no un dominio).

**Frontend:**
- Los MFEs están organizados por **feature**, no por dominio. Ej: `cashier-mf` es un rol (cajero), no un dominio (pagos). `dashboard-mf` agrupa varios dominios (usuarios, sucursales, tenants, dashboard) en un solo MFE.

### Consistencia de nombres del negocio

El proyecto usa consistentemente **español** para rutas de negocio (`sucursales`, `categorias`, `menus`, `reportes`, `reservaciones`) e **inglés** para código (`branches`, `categories`, `menus`, `reports`, `reservations`). Esto es una decisión consciente (código en inglés, UI en español) y es consistente en todo el proyecto. Correcto.

### Tenant, Branch, Sucursal, Restaurante, Empresa

| Concepto | Representación | Está bien separado |
|----------|---------------|-------------------|
| **Tenant** (restaurante/empresa) | Modelo `Tenant` en schema `public` | Sí |
| **Branch** (sucursal) | Modelo `Branch` dentro del schema del tenant | Sí |
| **Sucursal** | Alias de Branch en español | Correcto |
| **Restaurante** | = Tenant | Correcto, aunque `Tenant` y `Restaurant` son intercambiables — debería elegirse uno |
| **Empresa** | = Tenant | Consistentemente usado como Tenant |

### Modelos anémicos

| Modelo | Anémico? | Evidencia |
|--------|----------|-----------|
| `Tenant` | Sí | Solo setters/getters, sin lógica de activación/suspensión/cambio de plan |
| `Branch` | Sí | Sin lógica de negocio (ej: "no se puede desactivar si tiene órdenes activas") |
| `User` | Sí | Sin lógica de cambio de rol, invitación, validación de email |
| `Order` | Sí | La lógica de estados está en `OrdersService`, no en el modelo |
| `Payment` | Sí | La lógica de split payments está en `PaymentsService` |
| `Discount`/`Promotion` | Sí | Sin lógica de validación de fechas, límites, combinaciones |

**Impacto**: Los modelos anémicos no son un problema crítico porque NestJS + Prisma no fuerzan DDD rico. Sin embargo, validaciones de estado deberían estar más cerca del modelo.

### Lógica de negocio en lugares incorrectos

| Lógica | Dónde está | Dónde debería estar |
|--------|-----------|-------------------|
| Validación de transiciones de estado de Order | `orders/orders.service.ts:155-170` | Podría estar en un `OrderStateMachine` o en el modelo |
| Cálculo de impuestos | `orders/orders.service.ts:17-18, 53-54` | Podría estar en un `TaxService` o `PricingService` |
| Generación de folio | `orders/orders.service.ts:267-274` | Correcto en service (requiere DB query para secuencia) |
| Split payments | `payments/payments.service.ts:76-87` | Correcto en service |
| Password hashing | `users/users.repository.ts:47-49` | Incorrecto — el hashing debería estar en un `PasswordService` o en `AuthService`, no en el repositorio |

---

## 10. SOLID Review

### SRP (Single Responsibility)

| Se cumple? | Archivo | Evidencia |
|-----------|---------|-----------|
| ✅ Sí | `tenants.controller.ts` | Solo recibe request, llama al service |
| ✅ Sí | `orders.service.ts` | Lógica de negocio de órdenes (folio, impuestos, transiciones) |
| ✅ Sí | `orders.repository.ts` | Solo queries a Prisma |
| ❌ No | `users.repository.ts` | Hace password hashing (debería estar en servicio) + queries — 2 responsabilidades |
| ❌ No | `dashboard-mf` | Agrupa dashboard, sucursales, usuarios, tenants, settings — es un "cajón de sastre" |
| ❌ No | `payments.repository.ts` | Actualiza `Order.status` y `Table.status` desde el repositorio — violación de que un repo solo toque su entidad |

### OCP (Open/Closed)

| Se cumple? | Evidencia |
|-----------|-----------|
| ❌ No | No hay extension points formales. Si se agrega un nuevo método de pago, hay que modificar `PaymentsService`. Si se agrega un nuevo rol, hay que modificar `RolesGuard` y todos los decoradores. |

### LSP (Liskov)

| Se cumple? | Evidencia |
|-----------|-----------|
| ✅ Sí (por ausencia) | No hay herencia significativa. Las interfaces (`AuthenticatedUser`, `TenantContext`) son consistentes. |

### ISP (Interface Segregation)

| Se cumple? | Evidencia |
|-----------|-----------|
| ✅ Sí | Los DTOs son específicos por operación. No hay interfaces "gordas". |
| ⚠️ Parcial | `@maison/types` es un archivo de 697 líneas con 14 secciones — no está segregado por dominio. Un MFE que solo usa `Order` igual importa todo el `@maison/types`. |

### DIP (Dependency Inversion)

| Se cumple? | Archivo | Evidencia |
|-----------|---------|-----------|
| ✅ Sí | Todos los services | Dependen de repositorios inyectados (abstracciones), no de Prisma directamente |
| ✅ Sí | NestJS DI | Inversión de control correcta via constructor injection |
| ❌ No | `auth.service.ts:18` | Depende de `TenantPrismaService.getClient()` (implementación concreta) en vez de un `AuthRepository` |
| ⚠️ Parcial | `packages/api-client` | Depende de `import.meta.env` (implementación concreta de Vite), no de una abstracción de config |

---

## 11. DRY/KISS/YAGNI Review

### Código duplicado

| Duplicación | Archivos | Líneas | Impacto |
|-------------|----------|--------|---------|
| Tipos duplicados | `apps/web-shell/src/types/*.ts` (8 archivos, ~400 líneas) vs `packages/types/src/index.ts` | ~400 | **ALTO** — dos fuentes de verdad que inevitablemente divergirán |
| BranchContext duplicado | `web-shell` + `dashboard-mf` + `menu-mf` + `orders-mf` + `reservations-mf` + `tables-mf` | ~300 | **ALTO** — 6 copias con lógica idéntica |
| Servicios API duplicados | `web-shell/src/services/*.ts` vs `dashboard-mf/src/services/*.ts` (4 pares) | ~100 | **MEDIO** — mismos endpoints, diferente estilo |
| Role routing duplicado | `web-shell/src/app/page.tsx` + `auth-mf/src/pages/LoginPage.tsx` | ~20 | **BAJO** — pero peligroso si cambian roles |
| Config de Vite federation duplicada | Cada MFE tiene su propio `vite.config.ts` con shared idéntico | 9 archivos, ~30 líneas c/u | **BAJO** — normal en monorepo MFE |
| Eventos duplicados | `packages/event-bus/src/events.ts` (frontend) vs backend no tiene eventos tipados | - | **MEDIO** — los eventos frontend/backend están desconectados |

### Capas innecesarias

| Capa | Archivo | Motivo |
|------|---------|--------|
| tables-mf | `apps/tables-mf/` | No está integrado, tiene bugs, no aporta valor como MFE separado |
| apps/frontend/ | `apps/frontend/` | Vacío, legacy |
| DiscountsModule separado | `apps/backend/src/discounts/` | Podría fusionarse con Promotions en uno solo `pricing` |
| web-shell/src/services/ | `apps/web-shell/src/services/*.ts` | Deberían ser consumidos desde `@maison/api-client` o un `@maison/services` |

### Abstracciones prematuras

| Abstracción | Archivo | Problema |
|-------------|---------|----------|
| EventBus backend | `apps/backend/src/event-bus/event-bus.service.ts` | In-memory EventEmitter. Correcto para ahora, pero simula ser un bus de eventos cuando no escala más allá del mismo proceso. |
| Repository Pattern en módulos CRUD simples | `discounts.repository.ts`, `promotions.repository.ts` | Para módulos sin lógica de negocio, el repository es puramente boilerplate. |

### Interfaces innecesarias

No hay interfaces explícitas para servicios/repositorios (NestJS inyecta por clase). Esto es correcto para el tamaño del proyecto.

### Services que solo delegan

| Service | Delegación pura? | Líneas |
|---------|-----------------|--------|
| `RolesGuard` | No | 32 — lógica real de verificación de roles |
| `TenantGuard` | No | 23 — lógica real de verificación de tenant |
| `discounts.service.ts` | **Casi sí** | Solo valida existencia |
| `promotions.service.ts` | **Casi sí** | Solo valida existencia |
| `categories.service.ts` | **Casi sí** | Solo CRUD |

### Repositories que solo envuelven Prisma

| Repository | Valor agregado |
|-----------|---------------|
| `users.repository.ts` | ✅ bcrypt, omit passwordHash, auto-create UserBranch |
| `branches.repository.ts` | ✅ slug generation, stats |
| `orders.repository.ts` | ✅ includes consistentes, cross-entity update |
| `payments.repository.ts` | ✅ cross-entity ops (orderStatus, tableStatus) |
| `discounts.repository.ts` | ❌ Solo CRUD |
| `promotions.repository.ts` | ❌ Solo CRUD |
| `categories.repository.ts` | ❌ Solo CRUD |

### Contextos duplicados

BranchContext duplicado 6 veces (ver sección 11 — Código duplicado).

### Tipos duplicados

8 archivos en `web-shell/src/types/` duplican `@maison/types` (ver sección 11).

---

## 12. Microfrontends Review

### ¿Está justificada la arquitectura MFE?

**Respuesta: Parcialmente.** Para un SaaS de restaurantes con 7-10 pantallas y roles diferenciados, MFEs agregan complejidad sin beneficio proporcional. Una SPA monolítica con lazy loading sería más simple y igual de mantenible. Sin embargo, dado que ya está implementada, algunos MFEs están bien justificados:

### Qué está bien

| Elemento | Motivo |
|----------|--------|
| Shell (web-shell) como host | Next.js 16 para SSR/SEO + routing centralizado |
| Event Bus cross-MFE | Comunicación desacoplada entre MFEs sin imports directos |
| Shared packages | `@maison/types`, `@maison/ui`, `@maison/auth-client`, `@maison/api-client`, `@maison/event-bus` — correcta extracción de código compartido |
| RemoteLoader genérico | Componente reutilizable para cargar cualquier MFE |
| AuthGuard centralizado | Un solo punto de control de autenticación en el shell |

### Qué está mal

| Elemento | Problema |
|----------|----------|
| tables-mf como MFE independiente | No justificado. Las mesas son CRUD de dashboard. Puerto 5004 conflictivo. No integrado. |
| menus-mf como MFE independiente | El menú es CRUD que podría estar en dashboard-mf. El valor de tenerlo separado es bajo. |
| Duplicación de tipos | Shell tiene su propia copia de tipos — rompe el propósito de Module Federation (compartir código) |
| Duplicación de servicios | Shell y dashboard-mf tienen servicios duplicados |
| Duplicación de BranchContext | 6 implementaciones del mismo contexto |
| Module Federation hacks | `bridgeSharedModules` y `installViteReactPreamble` son workarounds frágiles |

### Qué MFE sobra

| MFE | Motivo |
|-----|--------|
| **tables-mf** | Puerto conflictivo, no integrado, bug de typo, dominio mínimo |
| **menu-mf** | Bajo valor como MFE separado. Podría fusionarse con dashboard-mf |
| **reservations-mf** | Bajo valor como MFE separado. Podría fusionarse con dashboard-mf |

### Qué MFE debería fusionarse

| MFEs a fusionar | Justificación |
|----------------|---------------|
| **menu-mf** → **dashboard-mf** | El menú es contenido que administra el dueño/admin, mismo rol objetivo |
| **reservations-mf** → **dashboard-mf** | Las reservas son una función más del dashboard |
| **tables-mf** → **dashboard-mf** | CRUD de mesas, mismo rol |
| **orders-mf + kitchen-mf + cashier-mf** | Los tres son el mismo flujo de trabajo (orden → cocina → cobro) |

**Resultado propuesto**: De 9 MFEs a **4 MFEs**:
1. `auth-mf` — login, recover password
2. `dashboard-mf` — dashboard, admin, sucursales, usuarios, menú, categorías, inventario, mesas, reservas, settings
3. `orders-mf` — ordenes, cocina, cajero (todo el flujo de órdenes)
4. `reports-mf` — reportes y analytics

### Qué MFE está demasiado acoplado

**dashboard-mf** está acoplado a demasiados dominios: dashboard, sucursales, usuarios, tenants, menus, categorías, inventario, settings. Es un monolito dentro del MFE.

### Qué dependencia rompe Module Federation

`packages/api-client` usa `import.meta.env.VITE_API_URL` — esto solo funciona en Vite. El shell es Next.js y necesita pasar la URL por variable de entorno de Next.js. Actualmente el shell usa sus propias variables (`NEXT_PUBLIC_*`), pero el `api-client` dentro del shell (si se ejecuta desde el servidor de Next.js) rompería. Esto se "resuelve" porque el api-client solo se ejecuta en los MFEs (Vite), no en el shell. Es una bomba de tiempo.

### Qué conviene conservar

- `@maison/event-bus` — correcto
- `@maison/auth-client` — correcto
- `@maison/types` — debe ser la única fuente de verdad
- `@maison/ui` — correcto, expandible
- Shell con routing centralizado — correcto
- `RemoteLoader` — patrón correcto

---

## 13. Backend NestJS Review

### Controller/Service/Repository: ¿justificado?

| Módulo | Justificado? | Motivo |
|--------|-------------|--------|
| Users | ✅ Sí | Lógica de invitación, roles, estados |
| Orders | ✅ Sí | Folio, impuestos, transiciones, stats, eventos |
| Payments | ✅ Sí | Split payments, validaciones, eventos |
| Reports | ✅ Sí | Agregaciones complejas, export CSV |
| Auth | ✅ Sí | Login, JWT, refresh |
| Branches | ✅ Sí | Slug, stats, activación |
| Tenants | ✅ Sí | Ciclo de vida del tenant |
| Menus | ✅ Sí | CRUD con categorías |
| Tables | ✅ Sí | CRUD con disponibilidad |
| Categories | ⚠️ Bajo | CRUD simple, pero tiene relación con Menus |
| Discounts | ❌ No | CRUD puro, podría ser sub-módulo de otro |
| Promotions | ❌ No | CRUD puro, fusionable con Discounts |

### Módulos bien delimitados

✅ La mayoría están bien delimitados. Cada módulo cubre un agregado del dominio.

### Módulos demasiado pequeños

- `DiscountsModule` — 4 archivos, 0 lógica de negocio real
- `PromotionsModule` — 4 archivos, 0 lógica de negocio real
- `EventBusModule` — Correcto como módulo global pequeño

### Módulos demasiado grandes

- `OrdersModule` — El más complejo pero acorde a la complejidad del dominio

### Responsabilidades mezcladas

- `payments.repository.ts` actualiza `Order.status` y `Table.status` — un repositorio de pagos no debería tocar mesas. Esa lógica debería estar en el service que coordina varios repositorios.

### Prisma bien encapsulado?

✅ Sí, a través de `TenantPrismaService` y `PrismaService`. Ningún service (excepto auth) toca Prisma directamente. Los repositorios son la única capa que usa Prisma.

### Repository Pattern: ¿aporta valor o solo ruido?

**Aporta valor cuando**: hay lógica transversal (bcrypt, slug, includes consistentes, field omission).
**Solo ruido cuando**: es CRUD puro (discounts, promotions, categories).

Veredicto: ~70% aporta valor, ~30% es boilerplate.

---

## 14. Frontend Review

### Shell vs MFEs vs Packages

✅ Separación clara. Shell es el host, MFEs son remotos, Packages son compartidos.

### Estado global

❌ No existe estado global formal. Se usa React Context para:
- `ThemeContext` — correcto
- `SidebarContext` — correcto
- `BranchContext` — correcto pero duplicado 6 veces

No hay Redux, Zustand, Jotai, ni ninguna librería de estado. Para el alcance, es correcto.

### Event Bus

✅ `@maison/event-bus` con CustomEvent en `window`. Simple, efectivo, sin dependencias. Correcto.

### BranchContext

❌ Duplicado 6 veces. Debería estar en `@maison/ui` o ser inyectado por el shell como prop a los MFEs.

### AuthClient

✅ `packages/auth-client/src/index.ts` — localStorage + JWT parsing. Correcto y simple. NOTA: no implementa refresh token flow real, solo almacena el refresh token sin usarlo.

### ApiClient

✅ `packages/api-client/src/client.ts` — fetch wrapper con JWT y tenant-slug. Correcto.
❌ Dependencia de `import.meta.env` — limita el paquete a entornos Vite.

### UI Package

✅ `packages/ui/src/` — componentes ligeros (Skeleton, StatCard, Icons, EmptyState, cn).
⚠️ Sin componentes de formulario (Button, Input, Modal, Select). Cada MFE implementa los suyos.
⚠️ `Icons.tsx` de 356 líneas podría externalizarse a una librería de iconos (lucide, heroicons).

### Duplicación de lógica

Ver sección 11. Duplicación masiva de tipos, servicios, contextos.

### Riesgo de inconsistencia entre MFEs

| Riesgo | Probabilidad | Impacto |
|--------|-------------|---------|
| Tipos divergentes entre shell y shared | Alta | Alto — errores en runtime |
| BranchContext con comportamiento diferente | Media | Alto — branch incorrecto en MFE |
| Servicios con endpoints diferentes | Media | Medio — un MFE llama a endpoint que ya no existe |
| Versiones de React duplicadas en runtime | Baja (por singleton en federation) | Alto — "dispatcher null" crash |

---

## 15. Escalabilidad

### 10 tenants
✅ Sin problemas. El Map de `TenantPrismaService` tendrá 10 clientes. PostgreSQL maneja 10 schemas sin esfuerzo.

### 100 tenants
✅ Funciona. 100 conexiones en el Map. Uso de memoria: ~100 * ~20MB = ~2GB solo para Prisma clients. PostgreSQL maneja 100 schemas. La conexión total a DB será ~100 conexiones.

### 1,000 tenants
⚠️ **Problemas probables:**
- **Memoria**: 1,000 PrismaClients × ~20MB = ~20GB de RAM. El Map actual no tiene límite ni evicción.
- **PostgreSQL connections**: 1,000 conexiones simultáneas requieren `max_connections=1000+` en pg, que necesita ~ 64GB RAM para PostgreSQL.
- **Solución**: Usar pool de conexiones (PgBouncer) + crear clientes bajo demanda con TTL.

### 5,000 tenants
❌ **No escala con la arquitectura actual.** El Map tendría 5,000 clientes = ~100GB RAM. PostgreSQL tendría 5,000 schemas (soportado) pero 5,000 conexiones no son viables. Se necesita:
- Pool de conexiones externo (PgBouncer + RDS Proxy).
- Connection pool en Node (prisma utiliza internamente `pg` pool, pero cada cliente crea su propio pool).
- Estrategia de conexión lazy + TTL + evicción LRU.

### 100 sucursales por tenant
✅ Dentro del schema del tenant, 100 branches es trivial para PostgreSQL.

### 500 órdenes simultáneas
⚠️ **Depende de la concurrencia de escritura.** 500 órdenes simultáneas en un solo tenant con un solo PrismaClient que tiene un pool de conexiones default (10) generará contención. Se necesita:
- Aumentar pool de conexiones en PrismaClient.
- Usar transacciones para consistencia.

### 50 usuarios conectados por tenant
✅ 50 conexiones HTTP es manejable.

### 20 cocinas activas
❌ **Sin WebSocket, el modelo no soporta cocinas en tiempo real.** Actualmente no hay WebSocket, ni Server-Sent Events, ni polling. Las cocinas no recibirían actualizaciones de órdenes en tiempo real.

### Alta concurrencia en pagos
⚠️ **Riesgo medio.** `PaymentsService` no tiene manejo de concurencia (optimistic locking, versionado). Dos pagos simultáneos sobre la misma orden podrían procesarse ambos. Se necesita:
- Transacciones serializables.
- Versionado de orden (`version` field con `@@version` o manual).

### Dónde explotaría primero

| Componente | Punto de fallo | Umbral estimado |
|-----------|---------------|-----------------|
| **Node** | Map de PrismaClients sin límite — OOM | ~500-1,000 tenants |
| **PostgreSQL** | Conexiones simultáneas | ~200 conexiones simultáneas |
| **Prisma** | Pool de conexiones default (10) por cliente | ~50 órdenes concurrentes por tenant |
| **Network** | `x-tenant-slug` en cada request — overhead trivial | No es bottleneck |
| **Cache** | **NO EXISTE** — cada request viaja a DB | Impacta inmediato |
| **WebSocket** | **NO EXISTE** — cocinas no reciben updates | Impacta inmediato |
| **Queue** | **NO EXISTE** — pagos concurrentes sin cola | Riesgo en pay-heavy load |
| **Frontend** | Module Federation — archivos grandes de remoteEntry | > 10 MFEs concurrentes |
| **Module Federation** | `bridgeSharedModules` hack — frágil | Primer cambio de versión de React |

---

## 16. Mantenibilidad

### 1 dev
✅ Perfectamente mantenible. Una persona puede entender todo el código en 1-2 semanas.

### 5 devs
⚠️ **Posible con reglas claras.** Cada dev podría tomar 1-2 MFEs + backend módulos. El riesgo es pisarse en `@maison/types` y en el shell.

### 10 devs
❌ **Generaría caos sin más estructura.** No hay:
- Contratos de API (OpenAPI) que frontend/backend acuerden.
- ADRs para decisiones arquitectónicas.
- Lint rules que enforce la arquitectura.
- Code ownership claro.
- Testing que valide contratos.

### 30 devs
❌ **Caos total.** Sin los elementos arriba, 30 devs generarían conflictos constantes en tipos compartidos, el shell, y los MFEs.

### Reglas de arquitectura que faltan

1. **Regla de dependencia**: Los MFEs NO deben importar de `@/types/` del shell.
2. **Regla de tipos**: `@maison/types` es la única fuente de verdad para tipos compartidos.
3. **Regla de contexto**: El BranchContext debe vivr en `@maison/ui` y compartirse como singleton de Module Federation.
4. **Regla de servicios**: Los servicios API deben estar en shared packages, no en apps.
5. **Regla de puertos**: Cada MFE debe tener un puerto único asignado centralmente.
6. **Regla de MFE**: Ningún MFE debe superar X líneas de código.
7. **Regla de tests**: Todo nuevo módulo debe incluir tests.

### Convenciones que faltan

1. **Nombramiento de archivos**: Algunos usan kebab-case, otros PascalCase. Inconsistente.
2. **Orden de parámetros en repos**: `(schema, data)` vs `(data, schema)` — inconsistente en `reservations.repository.ts`.
3. **Declaración de tipos en DTOs**: Algunos módulos separan cada DTO en archivo individual, otros los agrupan.
4. **Formato de commit**: No hay conventional commits.
5. **Documentación de Swagger**: No todos los endpoints tienen decoradores `@ApiOperation`/`@ApiResponse`.

---

## 17. Eliminar

| Archivo/carpeta | Motivo | Riesgo de eliminar | Beneficio |
|----------------|--------|-------------------|-----------|
| `apps/tables-mf/` | Puerto 5004 conflictivo, no integrado en shell, typo `TablesPagee`, sin ruta en shell, 0 valor como MFE independiente | Bajo — no se usa | Elimina código muerto, libera puerto |
| `apps/frontend/` | Solo node_modules, sin código fuente, legacy | Bajo — no se usa | Limpieza inmediata |
| `apps/web-shell/src/types/` (8 archivos) | Duplicación de `@maison/types` con 2 tipos extra insignificantes | Medio — requiere migrar imports del shell a `@maison/types` | Elimina fuente de verdad duplicada, ~400 líneas |
| `apps/dashboard-mf/src/services/` (4 archivos) | Duplicación de `web-shell/src/services/` | Medio — migrar consumers a los servicios del shell o a shared package | Elimina duplicación |
| `apps/dashboard-mf/src/context/BranchContext.tsx` | Duplicación del shell | Medio — migrar dashboard-mf a usar el BranchContext compartido | Elimina 6ta copia de BranchContext |
| `apps/web-shell/tsconfig.json` paths `@/types/*` | Apunta a tipos que deben eliminarse | Alto si se eliminan los tipos primero | Dependencia temporal |
| `docs/` (vacío) | Sin contenido | Bajo | Limpieza |
| `infra/` (vacío) | Sin contenido | Bajo | Limpieza |
| `scripts/` (vacío) | Sin contenido | Bajo | Limpieza |
| `apps/backend/src/discounts/` y `promotions/` como módulos separados | Fusionar en `pricing/` | Medio — refactor de imports | Reduce módulos innecesarios |
| 5 copias de BranchContext en MFEs | Deben ser singleton de `@maison/ui` | Medio — refactor de imports en cada MFE | Elimina 6 → 1 |

---

## 18. Conservar

| Decisión/patrón | Motivo | Beneficio |
|----------------|--------|-----------|
| Schema-per-tenant multitenancy | Aislamiento real de datos, sin cross-contamination, sin SQL complejo de `WHERE tenant_id = X` | Seguridad, simplicidad de queries, backup/restore por tenant |
| Controller → Service → Repository → Prisma | Separación limpia de responsabilidades, testable | Mantenibilidad, testabilidad |
| TenantMiddleware (3 estrategias) | Resolución flexible (JWT, header, subdominio) | Adaptabilidad a diferentes escenarios de despliegue |
| Guards chain (JWT → Roles → Tenant) | Defensa en profundidad | Seguridad |
| `@maison/event-bus` con CustomEvent | Comunicación cross-MFE simple, sin dependencias, type-safe | Desacoplamiento frontend |
| `@maison/auth-client` | Token management encapsulado | Consistencia de auth |
| `@maison/types` como shared package | Tipos centralizados | Consistencia de tipos (debe ser la ÚNICA fuente) |
| `@maison/ui` | Componentes compartidos | Consistencia visual |
| Swagger con Bearer + tenant header | API documentada | Onboarding, testing |
| Global ValidationPipe con whitelist | Seguridad y consistencia de datos | Previene inyección de campos |
| NestJS `@Global()` DatabaseModule | PrismaService y TenantPrismaService disponibles sin imports repetitivos | Reduce boilerplate |

---

## 19. Refactorizar

### Crítico

| Prioridad | Archivo/carpeta | Problema | Refactor recomendado | Riesgo | Beneficio |
|-----------|----------------|----------|---------------------|--------|-----------|
| **CRÍTICO** | `apps/web-shell/src/types/*.ts` → `@maison/types` | Dos fuentes de verdad para tipos | Eliminar `apps/web-shell/src/types/` y migrar todos los imports del shell a `@maison/types`. Agregar los 2 tipos extra (`StatCardConfig`, `AdminProfile`) a `@maison/types` | Medio — hay que cambiar imports en todo el shell | Elimina duplicación, fuente única de verdad |
| **CRÍTICO** | `apps/tables-mf/` | MFE roto, conflictivo, no integrado | Eliminar el directorio completo. Mover lógica de mesas a `dashboard-mf` o mantener solo si hay planes concretos de uso | Bajo — no está integrado | Elimina código muerto |

### Alto

| Prioridad | Archivo/carpeta | Problema | Refactor recomendado | Riesgo | Beneficio |
|-----------|----------------|----------|---------------------|--------|-----------|
| **ALTO** | BranchContext en 6 apps | Duplicación de lógica | Mover BranchContext a `@maison/ui`, exportar como singleton, que los MFEs lo consuman como shared module de federation | Medio — cambiar imports en 6 MFEs | Elimina 5 copias, consistencia |
| **ALTO** | Servicios duplicados (`web-shell` y `dashboard-mf`) | Mismos endpoints, diferente implementación | Mover servicios a `@maison/api-client` (o nuevo `@maison/services`). Que ambos shell y MFEs consuman desde allí | Medio — refactor de imports | Elimina duplicación |
| **ALTO** | `packages/api-client` dependencia de `import.meta.env` | No funciona en Next.js | Extraer configuración de base URL a un init/configure pattern o variable de entorno de runtime | Bajo — cambio interno | Portabilidad del paquete |

### Medio

| Prioridad | Archivo/carpeta | Problema | Refactor recomendado | Riesgo | Beneficio |
|-----------|----------------|----------|---------------------|--------|-----------|
| **MEDIO** | `apps/backend/src/auth/auth.service.ts` (línea 18) | Bypass del Repository pattern | Crear `AuthRepository` y mover las queries de Prisma allí | Bajo — es solo extraer 2 queries | Consistencia arquitectónica |
| **MEDIO** | `apps/backend/src/payments/payments.repository.ts` | Responsabilidad mezclada (update Order, update Table) | Mover cross-entity updates al service. El repo solo debe tocar Payment. | Bajo — refactor local | SRP |
| **MEDIO** | `apps/backend/src/users/users.repository.ts` (línea 47) | Password hashing en repo, no en service | Mover bcrypt a `AuthService` o nuevo `PasswordService` | Bajo — refactor local | SRP |
| **MEDIO** | `apps/backend/src/discounts/` + `promotions/` fusionar | 2 módulos casi idénticos | Fusionar en `apps/backend/src/pricing/` con `DiscountController`, `PromotionController` y `PricingService` | Bajo — refactor controlado | Reduce módulos |
| **MEDIO** | `apps/backend/src/reservations/reservations.repository.ts` (líneas 13, 32, 65, 72) | Parámetros en orden inconsistente | Cambiar `(data, schema)` → `(schema, data)` | Bajo — cambio de firma | Consistencia |
| **MEDIO** | `TenantPrismaService` Map sin TTL | Memory leak potencial a largo plazo | Agregar LRU cache con TTL (ej: `lru-cache` package) y reconexión automática | Medio — requiere testing | Escalabilidad |

### Bajo

| Prioridad | Archivo/carpeta | Problema | Refactor recomendado | Riesgo | Beneficio |
|-----------|----------------|----------|---------------------|--------|-----------|
| **BAJO** | `apps/web-shell/src/app/page.tsx` + `auth-mf/src/pages/LoginPage.tsx` | Role routing duplicado | Definir ROLE_ROUTES en `@maison/auth-client` o `@maison/constants` | Bajo | DRY |
| **BAJO** | `apps/backend/src/event-bus/` | Bus in-memory sin tipado de eventos | Tipar eventos igual que el frontend con `MaisonEventMap` | Bajo | Consistencia frontend/backend |
| **BAJO** | 9 `vite.config.ts` con bloques shared idénticos | Duplicación de configuración | Extraer shared config a paquete compartido o script | Bajo | DRY |
| **BAJO** | `apps/backend/src/common/utils/order-mapper.ts` | Utilidad pequeña pero ubicada genéricamente | Podría ir en `orders/` específicamente | Bajo | Cohesión |

---

## 20. Agregar

| Elemento | Motivo | Prioridad |
|----------|--------|-----------|
| **ADRs** (Architecture Decision Records) en `docs/adr/` | Documentar decisiones como schema-per-tenant, Module Federation, por qué 9 MFEs, etc. | **ALTA** |
| **Lint rules de arquitectura** | ESLint rules que prohíban imports incorrectos (ej: MFE no debe importar de `@/types/`) | **ALTA** |
| **OpenAPI contract as source of truth** | Usar `@nestjs/swagger` para generar spec y que los MFEs generen tipos desde allí | **ALTA** |
| **Testing infrastructure** | Jest config para services y controllers. Al menos unit tests para lógica de negocio crítica (Orders, Payments) | **ALTA** |
| **Health check endpoint** | `@nestjs/terminus` con checks de DB, Prisma, memoria | **ALTA** |
| **WebSocket** | Para cocina en tiempo real, estado de mesas, notificaciones | **ALTA** |
| **Caché distribuido** (Redis) | Cachear consultas repetitivas (menús, categorías, stats de dashboard) | **ALTA** |
| **Rate limiting** | `@nestjs/throttler` para endpoints públicos (login, register) | **ALTA** |
| **Queue system** (Bull + Redis) | Pagos concurrentes, procesos pesados, notificaciones asíncronas | **MEDIA** |
| **Pagination standardization** | El patrón de paginación existe (`PaginationDto`) pero no está estandarizado en todos los controladores | **MEDIA** |
| **Observability** (logs estructurados, métricas) | OpenTelemetry, Pino logger, métricas de negocio | **MEDIA** |
| **CI/CD pipeline** | GitHub Actions para lint, test, build | **MEDIA** |
| **Docker Compose** | Para desarrollo local con PostgreSQL, Redis, etc. | **MEDIA** |
| **Security headers** | Helmet, CORS hardening, CSP | **MEDIA** |
| **Audit logging** | `ActivityLog` model existe pero no hay middleware/sistema que lo alimente automáticamente | **MEDIA** |
| **Contracts de API compartidos** | `@maison/api-contracts` con tipos de request/response para endpoints | **BAJA** |
| **Error boundaries en MFEs** | Atrapar errores de carga de remotos con fallback | **BAJA** |
| **Conventional commits + changelog** | Estandarizar commits, generar changelog automático | **BAJA** |

---

## 21. Reglas arquitectónicas recomendadas

1. **Regla de fuente única de tipos**: `@maison/types` es la ÚNICA fuente de verdad para todos los tipos compartidos. Ningún `apps/` puede tener su propio `types/` que duplique tipos existentes.

2. **Regla de dependencia unidireccional shared → apps**: Los packages `@maison/*` NO pueden depender de ningún `apps/*`. Las apps pueden depender de packages.

3. **Regla de dependencia shell → MFE**: El shell NO debe duplicar lógica de negocios de los MFEs. Los servicios de API deben estar en `@maison/api-client`.

4. **Regla de contextos compartidos**: Todo React Context que deba ser consumido por múltiples MFEs debe vivir en `@maison/ui` y ser compartido via Module Federation como singleton.

5. **Regla de no duplicación de servicios**: Los API service files deben vivir en shared packages. No se permiten servicios duplicados en apps.

6. **Regla de puertos**: Cada MFE debe tener un puerto único. Los puertos se asignan centralizadamente en un documento o archivo de configuración.

7. **Regla de test**: Todo módulo nuevo debe incluir tests unitarios para los services y al menos un test e2e para los endpoints.

8. **Regla de OpenAPI**: Todo endpoint debe tener decoradores `@ApiOperation`, `@ApiResponse`, `@ApiParam` en el controller.

9. **Regla de compatibilidad MFE-shell**: Todos los MFEs deben compartir la MISMA versión de React, ReactDOM, react-router-dom, y packages `@maison/*`. Version bumps se hacen coordinadamente.

10. **Regla de no bypass del Repository**: Ningún service (excepto auth, documentado) debe usar `TenantPrismaService.getClient()` directamente.

---

## 22. Ruta de trabajo recomendada

### Rama 1: limpieza segura (1-2 días)
**Eliminar código muerto y duplicación de tipos**
- Eliminar `apps/tables-mf/`
- Eliminar `apps/frontend/`
- Eliminar `apps/web-shell/src/types/` y migrar imports a `@maison/types`
- Eliminar `docs/`, `infra/`, `scripts/` vacíos
- Agregar tipos faltantes (`StatCardConfig`, `AdminProfile`) a `@maison/types`
- Agregar rule de ESLint: no import from `@/types/`

### Rama 2: seguridad y estabilidad (3-5 días)
**Rate limiting, health checks, caché, WebSocket**
- Agregar `@nestjs/throttler` para rate limiting
- Agregar `@nestjs/terminus` para health checks
- Agregar `ioredis` + `@nestjs/cache-manager` para caché distribuido
- Agregar WebSocket (`@nestjs/websockets` + `socket.io`) para cocina y órdenes
- Agregar Helmet para security headers
- Refactor `TenantPrismaService` con LRU cache + TTL

### Rama 3: integración frontend-backend (3-5 días)
**Unificar servicios, estandarizar API, eliminar duplicación**
- Extraer servicios API de `web-shell` y `dashboard-mf` a `@maison/api-client`
- Mover `BranchContext` a `@maison/ui` como singleton
- Agregar `@maison/api-contracts` con tipos request/response
- Refactor `AuthService` para usar `AuthRepository`
- Unificar `Discounts` y `Promotions` en `PricingModule`
- Estandarizar parámetros en `ReservationsRepository`

### Rama 4: arquitectura compartida (2-3 días)
**ADRs, lint rules, convenciones, documentación**
- Escribir ADRs para decisiones clave
- Configurar ESLint con reglas arquitectónicas
- Agregar conventional commits (commitlint, husky)
- Estandarizar tsconfigs (falta root tsconfig, faltan en packages)
- Agregar Docker Compose para desarrollo local (PostgreSQL + Redis)

### Rama 5: testing y observabilidad (5-7 días)
**Cobertura de tests, monitoreo, logging**
- Escribir tests unitarios para servicios críticos (Orders, Payments, Auth, Reports)
- Escribir tests e2e para endpoints principales
- Agregar OpenTelemetry + Pino logger
- Agregar structured logging en middleware
- Setup CI/CD con GitHub Actions
