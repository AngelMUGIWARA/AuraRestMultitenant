# AUDITORÍA TÉCNICA COMPLETA — AuraRestMultitenant

**Fecha:** 21 de julio de 2026
**Rama analizada:** `micro-frontend` (último commit: `d65b639`)
**Alcance:** Monorepo completo (backend, web-shell, 9 MFEs, 5 paquetes compartidos)

---

# 1. Estado General del Proyecto

## Resumen Ejecutivo

AuraRestMultitenant es un **SaaS multitenant para restaurantes** con arquitectura SOFEA y Module Federation. El proyecto cuenta con un backend NestJS 11 funcional con 16 módulos de dominio, Prisma 6 como ORM, multitenancy por esquemas PostgreSQL, y un frontend compuesto por un shell Next.js 16 + 9 microfrontends Vite 6.

**Veredicto:** El backend está **sorprendentemente completo** con ~5,300 líneas de código de aplicación, 16 módulos, autenticación JWT con refresh, rate limiting, y validaciones. El frontend tiene la **infraestructura de Module Federation bien resuelta** pero presenta **deuda técnica significativa** en forma de código muerto, duplicación, y configuración inconsistente.

## Nivel de Avance

| Dimensión | Avance | Estado |
|-----------|--------|--------|
| Backend (NestJS + Prisma) | ~85% | Casi producción — faltan filtros avanzados, soft-delete, auditoría |
| Web Shell (Next.js) | ~90% | Funcional — código muerto en servicios/hooks no utilizados |
| auth-mf | ~95% | Completo — login, refresh, forgot-password |
| dashboard-mf | ~80% | Funcional — CRUD de sucursales/usuarios incompleto |
| menu-mf | ~75% | Listado funcional — CRUD de productos/categorías pendiente |
| orders-mf | ~80% | Listado y filtros — cambio de estado y cancelación pendientes |
| kitchen-mf | ~85% | KDS funcional — priorización y alertas sonoras pendientes |
| cashier-mf | ~80% | POS funcional — propinas, descuentos, división de cuentas pendientes |
| reports-mf | ~30% | **Placeholder** — 4 páginas "En construcción" |
| reservations-mf | ~85% | Listado y cancelación — creación y calendario pendientes |
| tables-mf | ~85% | CRUD funcional — migración desde web-shell incompleta |
| Paquetes compartidos | ~70% | 5 paquetes con `.d.ts` desincronizados |
| Pruebas | ~15% | 1 unit test backend, 7 e2e, 8 frontend tests |
| CI/CD | ~20% | Solo build+test backend en CI |
| Documentación | ~60% | README exhaustivo pero sin docs técnicas |
| Infraestructura | ~15% | Docker solo para backend, `infra/` vacío |

## Qué está terminado

- Arquitectura monorepo con pnpm workspaces
- 5 paquetes compartidos (`@maison/*`) funcionando
- Module Federation runtime con 9 remotes
- Shell con navegación por roles, RemoteLoader, AuthGuard, ThemeContext, SidebarContext
- Backend completo: 16 módulos NestJS con Controller → Service → Repository
- Prisma schemas (system + tenant) con 20+ modelos
- Multitenancy por esquemas PostgreSQL con TenantPrismaService (pool LRU)
- Autenticación JWT + refresh tokens + voice auth
- Rate limiting global (60 req/60s, 5 para login)
- Swagger documentado en `/api/docs`
- Docker compose (postgres + backend)
- Event-bus tipado con 16 eventos

## Qué sigue siendo MVP

- CRUD de productos/categorías (solo listado)
- CRUD de sucursales/usuarios (solo listado)
- Creación de reservaciones (solo listado y cancelación)
- Cambio de estado de pedidos en orders-mf
- Reportes (todo placeholder)
- Propinas, descuentos, división de cuentas en cashier-mf

## Qué ya puede considerarse producción

- Backend core (auth, orders, payments, kitchen, tenants)
- Infraestructura Module Federation
- Paquetes compartidos (con corrección de `.d.ts`)
- Sistema de autenticación completo
- Multitenancy funcional

---

# 2. Arquitectura SOFEA

## Evaluación de Principios SOFEA

| Principio | Cumplimiento | Notas |
|-----------|:------------:|-------|
| Shell como orquestador puro | ⚠️ Parcial | Shell contiene 9 servicios de dominio y 8 hooks que son código muerto pero violan la separación |
| Cada MFE es una isla independiente | ❌ No | `reservations-mf` importa directamente de `tables-mf` vía filesystem; `dashboard-mf` importa de `reservations-mf` |
| Comunicación solo vía event-bus | ⚠️ Parcial | MFEs escuchan `branch:changed` correctamente, pero la implementación es inconsistente (3 mecanismos diferentes) |
| Sin estado global compartido | ✅ Sí | Cada MFE maneja su estado local con hooks propios |
| Despliegue independiente | ❌ No | Los imports directos entre MFEs acoplan sus ciclos de vida |

## Violaciones Identificadas

### V1. Imports directos entre MFEs (CRÍTICO)

```
reservations-mf/src/components/ReservationModal.tsx:4
  → import { tablesService } from '../../../tables-mf/src/services/tables.service';

dashboard-mf/src/App.tsx:12
  → import ReservacionesPage from '../../reservations-mf/src/pages/ReservacionesPage';
```

**Impacto:** Imposible desplegar MFEs independientemente. Si `tables-mf` cambia su servicio, `reservations-mf` se rompe.

### V2. Código muerto en el shell (~1,100 líneas)

| Archivo | Líneas | Problema |
|---------|--------|----------|
| `web-shell/src/services/` (9 archivos) | ~255 | Servicios de dominio que nadie consume |
| `web-shell/src/hooks/` (8 archivos) | ~464 | Hooks de fetching que nadie usa |
| `web-shell/src/components/admin/dashboard/` (3 archivos) | ~417 | Componentes de dashboard que no se renderizan |
| `web-shell/src/types/` (2 archivos) | ~18 | Tipos redundantes con `@maison/types` |
| `web-shell/src/app/page.module.css` | ~142 | CSS boilerplate de Next.js sin usar |

### V3. Lógica de sucursal fragmentada (3 mecanismos)

| Mecanismo | MFEs que lo usan |
|-----------|------------------|
| `BranchProvider` + `useBranch()` de `@maison/ui` | dashboard-mf, menu-mf, orders-mf, reservations-mf, tables-mf |
| `useBranchFilter()` custom (event-bus manual) | reports-mf, kitchen-mf, cashier-mf |
| `BranchSelector` duplicado (web-shell vs dashboard-mf) | web-shell, dashboard-mf |

### V4. Layout duplicado

`dashboard-mf` tiene sus propios `AdminShell.tsx`, `AdminSidebar.tsx`, `AdminTopbar.tsx` que son copias de los del web-shell. Según SOFEA, el layout es responsabilidad del shell, no del MFE.

## Duplicación de Lógica

| Código | Copias | Ubicaciones |
|--------|--------|-------------|
| `cn()` utility | **7** | @maison/ui + 6 MFEs |
| `formatCurrency()` | **9** | @maison/ui + 6 utils.ts + 3 inline |
| `formatNumber()` | **6** | 6 MFEs |
| `formatPercent()` | **6** | 6 MFEs |
| `getInitials()` | **6** | 6 MFEs |
| `branches.service.ts` | **2** | web-shell + dashboard-mf (con tipos diferentes) |
| `AdminShell/AdminSidebar/AdminTopbar` | **2** | web-shell + dashboard-mf |
| `BranchSelector` | **2** | web-shell + dashboard-mf |
| Status badge maps | **8+** | Cada MFE define sus propios STATUS_BADGE |

## Eventos Innecesarios

Ninguno detectado. Los 16 eventos definidos en `event-bus` son todos justificados y domain-appropriate.

## Contextos Duplicados

`BranchContext` existe en 3 implementaciones:
1. `@maison/ui/branch/BranchContext.tsx` (la canónica)
2. `reports-mf/src/hooks/useBranchFilter.ts` (reimplementación simplificada)
3. `kitchen-mf` y `cashier-mf` implementan branch state inline con `useState` + `on('branch:changed')`

## Dependencias entre MFEs

| Dependencia | Tipo | Severidad |
|-------------|------|-----------|
| `reservations-mf` → `tables-mf` | Import filesystem directo | 🔴 Crítico |
| `dashboard-mf` → `reservations-mf` | Import filesystem directo | 🔴 Crítico |
| `reports-mf` → JWT parsing manual (no usa `@maison/auth-client`) | Abstracción rota | 🟠 Alto |

---

# 3. Backend

## Estructura General

- **Framework:** NestJS 11.x
- **ORM:** Prisma 6.x
- **DB:** PostgreSQL 16 (multitenancy por esquemas)
- **Auth:** Passport JWT + Role-based guards
- **Total archivos fuente:** ~120 TypeScript
- **Total líneas:** ~5,300
- **Módulos:** 16

## Desglose por Módulo

| Módulo | Líneas (svc+repo+ctrl) | Archivos | Estado |
|--------|------------------------|----------|--------|
| **orders** | 414+134+108 = 656 | Service, Repository, Controller, DTOs | ✅ Completo |
| **reports** | 247+200+92 = 539 | Service, Repository, Controller | ✅ Completo |
| **payments** | 199+82+49 = 330 | Service, Repository, Controller | ✅ Completo |
| **auth** | 148+106 = 254 | Service, Repository, Strategies, Guards | ✅ Completo |
| **kitchen** | 113+100+59 = 272 | Service, Repository, Controller, Gateway | ✅ Completo |
| **users** | 73+112+124 = 309 | Service, Repository, Controller, DTOs | ✅ Completo |
| **menus** | 49+114+123 = 286 | Service, Repository, Controller, DTOs | ✅ Completo |
| **branches** | 77+58+126 = 261 | Service, Repository, Controller, DTOs | ✅ Completo |
| **categories** | 39+89+104 = 232 | Service, Repository, Controller, DTOs | ✅ Completo |
| **reservations** | 101+75+78 = 254 | Service, Repository, Controller | ✅ Completo |
| **promotions** | 78+42+82 = 202 | Service, Repository, Controller | ✅ Completo |
| **discounts** | 75+32+86 = 193 | Service, Repository, Controller | ✅ Completo |
| **activity-log** | 78+44+28 = 150 | Service, Repository, Controller | ✅ Completo |
| **tables** | 46+27+60 = 133 | Service, Repository, Controller | ✅ Completo |
| **tenants** | 22+19+36 = 77 | Service, Repository, Controller | ✅ Completo |
| **health** | 20 | Controller only | ✅ Completo |

## Infraestructura Backend

| Componente | Archivo | Líneas | Estado |
|------------|---------|--------|--------|
| DatabaseModule | `database/database.module.ts` | Global | ✅ |
| TenantPrismaService | `database/tenant-prisma.service.ts` | 183 | ✅ Pool LRU |
| EventBusModule | `event-bus/event-bus.module.ts` | 18 | ✅ EventEmitter in-process |
| TenantMiddleware | `common/middleware/tenant.middleware.ts` | 55 | ✅ JWT → x-tenant-slug → subdomain |
| JwtAuthGuard | `common/guards/jwt-auth.guard.ts` | 18 | ✅ |
| RolesGuard | `common/guards/roles.guard.ts` | 26 | ✅ |
| TenantGuard | `common/guards/tenant.guard.ts` | 22 | ✅ |
| TransformInterceptor | `common/interceptors/` | — | ⚠️ Solo en Menus + Categories |
| ValidationPipe | `main.ts` | Global | ✅ whitelist + forbidNonWhitelisted + transform |

## Problemas Encontrados en Backend

### BUG: CORS con string malformado

**Archivo:** `apps/backend/src/main.ts:25`

```typescript
'http://localhost:5008, http://localhost:5014'
```

El string contiene una coma interna que lo convierte en **un solo origen** en lugar de dos. Debería ser dos strings separados en el array.

### Duplicate UserRole enum

**Archivos:** `create-user.dto.ts` y `invite-user.dto.ts` definen su propio `UserRole` enum en lugar de importarlo de `@maison/types`. El backend tiene `UserRole` en Prisma schema, `@maison/types` tiene otro, y los DTOs tienen un tercero. Tres definiciones del mismo enum.

### TransformInterceptor inconsistente

Solo aplicado a `MenusModule` y `CategoriesModule`. Los demás 14 módulos no lo usan. Si se quiere un response format consistente, debe ser global.

### DTOs vacíos

- `BranchResponseDto` — clase vacía (sin propiedades)
- `BranchFiltersDto` — clase vacía (sin propiedades)

### Sin filtro de excepciones global

No hay `@Catch()` global filter. Los errores no controlados pueden filtrar stack traces en producción.

### noImplicitAny: false

El `tsconfig.json` del backend tiene `noImplicitAny: false`, reduciendo significativamente la seguridad de tipos.

### ReservationsModule provee TenantPrismaService innecesariamente

`TenantPrismaService` ya es global vía `DatabaseModule`. No necesita ser proveído explícitamente.

## Prisma Schema

### System Schema (public)
- 1 modelo: `Tenant` con status, plan, slug, schemaName

### Tenant Schema (por restaurante)
- 20+ modelos: User, Category, MenuItem, RestaurantTable, Order, OrderItem, Payment, KitchenTicket, Reservation, Discount, Promotion, Tip, Branch, Role, Permission, RolePermission, UserBranch, Settings, ActivityLog
- 12 enums
- Índices en columnas de frecuente consulta
- Relaciones bien definidas

### Observaciones del Schema

- `Settings` es un key-value store genérico — podría causar problemas de tipo en el futuro
- `ActivityLog.changes` es `Text` (JSON serializado como string) — sin validación de estructura
- `Order.version` para optimistic locking — buena práctica
- `Payment.idempotencyKey` — buena práctica para prevenir duplicados
- `User.voiceUsername` y `voiceSeedHash` — soporte para autenticación por voz

## Swagger

Configurado en `main.ts` con:
- BearerAuth JWT
- API Key para `x-tenant-slug`
- Persistencia de autorización habilitada
- Endpoint: `/api/docs`

**Nota:** Los decoradores `@ApiOperation`, `@ApiResponse`, `@ApiTags` NO están en los controllers. Swagger muestra las rutas pero sin documentación descriptiva.

## Validaciones

- `ValidationPipe` global con `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- `class-validator` decorators en DTOs (`IsString`, `IsEmail`, `IsEnum`, etc.)
- `@maison/types` como dependencia del backend para tipos compartidos

## ActivityLog

Módulo completo con:
- Service (78 líneas) — logging best-effort (no falla si el log falla)
- Repository (44 líneas) — CRUD + query por entity + userId
- Controller (28 líneas) — GET con filtros
- Integrado como dependency injection en otros módulos

---

# 4. Frontend

## Web Shell

### Arquitectura
- **Framework:** Next.js 16.2.6 + React 19.2.4
- **Modo:** `output: "export"` (SSG estático, todo client-side)
- **Module Federation:** `@module-federation/runtime` v2
- **Archivos fuente:** 45 archivos, ~3,200 líneas
- **Rutas:** 25 páginas, todas delegan a `RemoteLoader`

### Componentes Clave

| Componente | Líneas | Función |
|------------|--------|---------|
| `RemoteLoader.tsx` | 82 | Carga dinámica de MFEs con skeleton y error handling |
| `AuthGuard.tsx` | 99 | Protección de rutas + refresh token automático |
| `AdminSidebar.tsx` | 268 | Navegación lateral admin con logout |
| `AdminTopbar.tsx` | 161 | Barra superior con branch selector y usuario |
| `BranchSelector.tsx` | 133 | Selector de sucursal dropdown |
| `WaiterLayout.tsx` | 88 | Layout para rol WAITER con bottom nav |
| `AdminShell.tsx` | 44 | Layout admin con sidebar + topbar |
| `TenantTable.tsx` | 146 | Tabla de tenants |
| `RevenueChartSection.tsx` | 141 | Sección de gráfico de ingresos |
| `ActivityFeed.tsx` | 130 | Feed de actividad reciente |

### Problemas del Shell

1. **Código muerto masivo:** 9 servicios, 8 hooks, 3 componentes de dashboard, 2 archivos de tipos — ~1,100 líneas sin consumir
2. **Usuario hardcodeado:** `AdminSidebar.tsx:186` muestra "Super Admin" / "admin@maison.mx" / "SA" en vez de leer de `AuthClient.getUser()`
3. **Sin Error Boundaries:** Ningún `error.tsx` en todo el árbol de rutas. Un crash en un MFE blancaneca toda la app
4. **CSS muerto:** `page.module.css` (142 líneas) es boilerplate de Next.js sin usar
5. **Assets muertos:** `public/` contiene SVGs de Next.js nunca referenciados

## Microfrontends

### Tabla Comparativa

| MFE | Archivos | Líneas | Páginas | Hooks | Servicios | Tests | Estado |
|-----|----------|--------|---------|-------|-----------|-------|--------|
| auth-mf | 8 | ~600 | 2 | 1 | 1 | 5 | ✅ |
| dashboard-mf | 20 | ~2,200 | 5 | 3 | 5 | 0 | ⚠️ |
| menu-mf | 10 | ~1,200 | 3 | 2 | 3 | 0 | ⚠️ |
| orders-mf | 8 | ~1,000 | 2 | 2 | 1 | 0 | ⚠️ |
| kitchen-mf | 6 | ~800 | 1 | 2 | 1 | 0 | ⚠️ |
| cashier-mf | 5 | ~1,500 | 1 | 2 | 1 | 0 | ⚠️ |
| reports-mf | 8 | ~900 | 4 | 1 | 1 | 0 | 🔴 |
| reservations-mf | 10 | ~1,300 | 2 | 2 | 2 | 3 | ⚠️ |
| tables-mf | 6 | ~700 | 1 | 1 | 1 | 0 | ⚠️ |

### Componentes Duplicados entre MFEs

| Componente/Función | MFEs que lo tienen |
|--------------------|--------------------|
| `utils.ts` (cn, formatCurrency, formatNumber, formatPercent, getInitials) | dashboard, menu, orders, tables, reports, reservations |
| `branches.service.ts` | dashboard, reservations (tipos diferentes) |
| `BranchSelector` | web-shell, dashboard-mf |
| `AdminShell/AdminSidebar/AdminTopbar` | web-shell, dashboard-mf |
| Status badge maps | Todos excepto auth y kitchen |

### Hooks Duplicados

Todos los hooks de fetching (`useDashboard`, `useUsers`, `useReservations`, `useOrders`, `useMenus`, `useInventory`, `useCategories`, `useBranches`, `useTables`) siguen el **mismo patrón boilerplate**:

```typescript
const [data, setData] = useState(null);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState(null);
const [filters, setFilters] = useState(defaultFilters);
const [tick, setTick] = useState(0);
useEffect(() => { fetch(filters).then(...) }, [filters, tick]);
```

Esto debería ser un hook genérico `usePaginatedQuery<T, F>(serviceFn, defaultFilters)`.

### Páginas Stub (Placeholder)

| MFE | Página | Texto mostrado |
|-----|--------|----------------|
| reports-mf | `LogsPage.tsx` | "Módulo en construcción" |
| reports-mf | `AnalyticsPage.tsx` | "Módulo en construcción" |
| reports-mf | `IntegrationsPage.tsx` | "Módulo en construcción" |
| dashboard-mf | `SettingsPage.tsx` | Sección parcial "En construcción" |

### Inconsistencias de API Response Unwrapping

| MFE | Patrón | Problema |
|-----|--------|----------|
| dashboard-mf | `res.data` | Estándar |
| orders-mf | `res.data.data` | Double unwrap |
| cashier-mf | `res.data.data` | Double unwrap |
| tables-mf | `response as any` con 3 fallbacks | Sin tipos |
| kitchen-mf | `Array.isArray(res) ? res : res.data` | Sin tipos |

### Console.error en Producción

| Archivo | Línea |
|---------|-------|
| `tables-mf/src/services/tables.service.ts` | 56 |
| `reservations-mf/src/pages/ReservacionesPage.tsx` | 270 |
| `reports-mf/src/pages/ReportesPage.tsx` | 41 |
| `orders-mf/src/hooks/useCreateOrder.ts` | 46 |

### Monolitos

- **`cashier-mf/src/pages/POSPage.tsx`** — ~1,000+ líneas: 6 SVGs inline, cart management, table selection, payment processing, order summary, todo en un solo archivo

### Navegación Rota

**`tables-mf/src/pages/TablesPage.tsx:11-12`:**
```typescript
// TODO: tech-debt — window.location.href forces full shell reload.
```
`window.location.href` en vez de SPA navigation rompe el estado de Module Federation.

---

# 5. Packages Compartidos

## @maison/types

| Aspecto | Estado |
|---------|--------|
| Archivos | `src/index.ts` (714 líneas) + `src/index.d.ts` (24 líneas) |
| Tipos exportados | ~50 tipos/interfaces |
| Dependencias | Ninguna (puro types) |
| `.d.ts` sync | ❌ **ROTO** — Solo declara 4 tipos genéricos, faltan 46+ tipos de dominio |
| Inconsistencia | `PaginatedResponse<T>` tiene forma plana en `.ts` y forma anidada en `.d.ts` |

**Tipos definidos:** Auth, Tenant, Branch, User, Dashboard, Menu, Category, Inventory, Order, Kitchen, Payment, Reservation, Table, Voice/Alexa, Reports + tipos genéricos de API.

## @maison/ui

| Aspecto | Estado |
|---------|--------|
| Componentes | Icons (55 iconos), Skeleton (5 variantes), EmptyState, StatCard, Modal, ConfirmDialog, TableCard, BranchProvider/useBranch |
| Dependencias | `@maison/event-bus`, `@maison/types`, React peer |
| `cn()` | Implementación propia (space-separated, no usa clsx/tailwind-merge) |
| `.d.ts` sync | ⚠️ **DESHINCRONIZADO** — Falta Modal, ConfirmDialog, BranchProvider, TableCard |
| Iconos | 55 SVG components con patrón `base()` HOF |

## @maison/event-bus

| Aspecto | Estado |
|---------|--------|
| Implementación | `CustomEvent` en `window` con namespace `maison:` |
| Eventos definidos | 16 |
| SSR guard | ✅ `getWindow()` con fallback |
| `.d.ts` sync | ❌ **ROTO** — Solo 5 de 16 eventos; payload de `auth:login` diferente |
| Hook | `useEventBus()` con `useRef` para estabilidad |

**Eventos:** auth:login, auth:logout, auth:session-expired, auth:token-refreshed, branch:changed, order:created, order:status-changed, order:cancelled, order:updated, payment:completed, menu:updated, reservation:created, reservation:cancelled, reservation:status-changed, table:status-changed, mfe:ready

## @maison/api-client

| Aspecto | Estado |
|---------|--------|
| Implementación | 155 líneas — get, post, put, patch, delete |
| Auto-refresh | ✅ Deduplicación de requests concurrentes |
| Tenant injection | ✅ `x-tenant-slug` header desde JWT |
| `.d.ts` sync | ✅ Sincronizado |
| Errores | `ApiClientError` con `statusCode` + `errors` |

**Observaciones:**
- Usa `import.meta.env.VITE_API_URL` con cast `as any`
- Excluye `/auth/login`, `/auth/refresh`, `/auth/logout` del refresh automático
- Emite `auth:session-expired` en fallo de refresh

## @maison/auth-client

| Aspecto | Estado |
|---------|--------|
| Implementación | 119 líneas — un solo archivo |
| API | `AuthClient` object con métodos estáticos |
| Tokens | `maison_access_token` + `maison_refresh_token` en localStorage |
| Expiry check | ✅ Con buffer de 30 segundos |
| `.d.ts` | No tiene (usa raw `.ts` como types entry) |

**Métodos:** getToken, setToken, getRefreshToken, setRefreshToken, clearTokens, isAuthenticated, isTokenExpired, getUser, getRole, getTenantSlug, getAuthHeader, hasReadOnlyAccess, getIsReadOnly

## Grafo de Dependencias

```
@maison/types           (sin dependencias)
    ↑
    ├── @maison/auth-client     (depende de types)
    ├── @maison/event-bus       (depende de types)
    ├── @maison/ui              (depende de types + event-bus)
    └── @maison/api-client      (depende de types + auth-client + event-bus)
```

**✅ Sin dependencias circulares. Dirección unidireccional correcta.**

## Oportunidades de Mejora

1. **Crear `packages/utils`** con `cn`, `formatCurrency`, `formatNumber`, `formatPercent`, `formatRelativeTime`, `getInitials`
2. **Crear `packages/hooks`** con `usePaginatedQuery`, `useBranchFilter` genérico
3. **Mover `BranchSelector` a `@maison/ui`**
4. **Crear `packages/constants`** con maps de status badges, labels, colores
5. **Eliminar todos los `.d.ts`** de packages (son stale y no se usan ya que `"types": "./src/index.ts"`)

---

# 6. Seguridad

## Estado de Seguridad

| Área | Estado | Detalle |
|------|--------|---------|
| JWT Auth | ✅ | Bearer token en Authorization header |
| Refresh Tokens | ✅ | Implementado en api-client con deduplicación |
| Rate Limiting | ✅ | 60 req/60s global, 5 req/60s para login |
| Tenant Isolation | ✅ | Prisma schemas separados + TenantMiddleware + TenantGuard |
| Password Hashing | ✅ | bcrypt via `bcryptjs` (backend package.json tiene `bcrypt`) |
| CORS | ⚠️ | Configuración correcta pero bug de string en `main.ts:25` |
| Validation | ✅ | `whitelist: true` + `forbidNonWhitelisted: true` |
| Swagger Auth | ✅ | BearerAuth + API Key configurados |

## Problemas de Seguridad

### S1. CORS bug (MEDIUM)

**`apps/backend/src/main.ts:25`:**
```javascript
'http://localhost:5008, http://localhost:5014'
```
String con coma interna — se interpreta como un solo origen. `http://localhost:5014` nunca se permite.

### S2. JWT parsing manual en reports-mf (MEDIUM)

**`reports-mf/src/services/reports.service.ts:45-48`:**
```typescript
const token = localStorage.getItem('access_token');
const payload = JSON.parse(atob(token!.split('.')[1]));
const schema = payload.schemaName || payload.schema_name;
```
Bypass de `@maison/auth-client`. Si el formato del token cambia (JWE, claims renombrados), esto se rompe silenciosamente. Además usa `'access_token'` en vez de `'maison_access_token'`.

### S3. Sin filtro de excepciones global (MEDIUM)

No hay `HttpExceptionFilter` global. Los errores no controlados pueden exponer stack traces.

### S4. localStorage para tokens (LOW)

`maison_access_token` y `maison_refresh_token` están en `localStorage`. Accesible por cualquier script XSS. Estándar para SPAs pero idealmente se usarían httpOnly cookies.

### S5. Sin CSRF protection (LOW)

No hay tokens CSRF. El CORS restringido mitiga parcialmente, pero con el bug de CORS (S1), la mitigación está comprometida.

### S6. `console.error` expone detalles (LOW)

4 archivos en MFEs usan `console.error` que puede filtrar información sensible en producción.

### S7. Hardcoded JWT secret en docker-compose.yml (INFO)

```yaml
JWT_SECRET: ${JWT_SECRET:-cambia_este_secreto_por_uno_seguro_en_produccion}
```
El default es inseguro pero está cubierto por `${JWT_SECRET:-...}`. En producción se debe sobrescribir.

### S8. Sin Content Security Policy headers (INFO)

No hay configuración de CSP, X-Frame-Options, X-Content-Type-Options, etc.

---

# 7. Performance

## Backend

### TenantPrismaService

- Pool LRU con `MAX_CLIENTS` configurables
- TTL y cleanup interval para clientes inactivos
- Schema routing vía JWT claims

### Posibles Problemas N+1

| Endpoint | Riesgo | Detalle |
|----------|--------|---------|
| `GET /admin/orders` | 🟠 Alto | Puede cargar OrderItems y Payments por separado |
| `GET /admin/dashboard/stats` | 🟠 Alto | Múltiples queries agregadas |
| `GET /admin/kitchen/queue` | 🟡 Medio | Puede cargar Order + Table por ticket |
| `GET /admin/reports/*` | 🟠 Alto | Queries agregadas complejas |

**Nota:** Sin revisar cada implementación de repository, no puedo confirmar N+1 con certeza, pero la arquitectura Repository sugiere que Prisma `include` se usa. Se recomienda auditar cada repository con `prisma.$queryRaw` o logging de queries.

### Sin Caching

No hay capa de cache (Redis, in-memory). Cada request consulta la base de datos. Para datos de solo lectura como menús, categorías, y configuración, un cache de corta duración mejoraría significativamente el rendimiento.

## Frontend

### Module Federation

- **Shared singletons:** `react` y `react-dom` correctamente configurados como `singleton: true`
- **Bridge logic:** `bridgeSharedModules()` previene instancias duales de React
- **Vite preamble:** `installViteReactPreamble()` para compatibilidad dev

### Renders

- Sin `React.memo`, `useMemo`, ni `useCallback` detectados en componentes pesados
- `POSPage.tsx` (~1,000 líneas) se re-renderiza completamente con cada cambio de estado
- `KitchenQueuePage` usa polling cada 30s como fallback — cada poll re-renderiza la cola

### Bundle Size

| App | Tecnología | Tamaño estimado |
|-----|-----------|----------------|
| web-shell | Next.js 16 (static export) | ~200KB (React + Next runtime) |
| Cada MFE | Vite 6 | ~80-150KB (React + dependencias compartidas) |
| **Total cargado en shell** | Shell + 1 MFE | ~300-350KB |
| **Total si todos los MFEs** | Imposible (carga bajo demanda) | N/A |

**Nota:** Las dependencias compartidas (`react`, `react-dom`, `@maison/*`) se deduplican vía Module Federation.

### Lazy Loading

✅ Correcto — cada MFE se carga dinámicamente via `loadRemote()` solo cuando se navega a su ruta.

---

# 8. Testing

## Estado Actual

| Tipo | Archivos | Cobertura | Estado |
|------|----------|-----------|--------|
| Unit tests backend | 1 (`tenant-prisma.service.spec.ts`) | ~2% | 🔴 Crítico |
| E2E tests backend | 7 (orders, payments, kitchen, auth, security, activity-log, app) | ~15% | ⚠️ Básico |
| Frontend tests auth-mf | 5 (LoginPage, ForgotPasswordPage, authService, AuthProvider, apiClient) | ~30% | ⚠️ |
| Frontend tests reservations-mf | 3 (ReservacionesPage, ReservationModal, reservations.service) | ~20% | ⚠️ |
| Frontend tests otros MFEs | 0 | 0% | 🔴 Crítico |
| Integration tests | 0 | 0% | 🔴 Crítico |
| E2E tests (Playwright) | 0 | 0% | 🔴 Crítico |

## Qué Falta Probar

### Backend
- Unit tests para **todos** los services (16 módulos × ~1 service cada uno)
- Unit tests para **todos** los repositories
- Unit tests para guards (JwtAuthGuard, RolesGuard, TenantGuard)
- Unit tests para middleware (TenantMiddleware)
- E2E tests para todos los endpoints (actualmente solo 7 de ~50+)
- Tests de validación de DTOs
- Tests de multitenancy (aislamiento entre schemas)

### Frontend
- Tests para **todos** los servicios de cada MFE
- Tests para **todos** los hooks
- Tests de rendering para componentes principales
- Tests de navegación (RemoteLoader)
- Tests de event-bus (emisión y suscripción)

### Integración
- Tests de flujo completo: login → dashboard → crear orden → cocina → pago
- Tests de comunicación entre MFEs via event-bus
- Tests de refresh token automático
- Tests de BranchProvider + useBranch

---

# 9. CI/CD

## GitHub Actions

**Archivo:** `.github/workflows/ci.yml`

```yaml
on:
  push:
    branches: [master, main, dev]
  pull_request:
    branches: [master, main, dev]

jobs:
  build:
    # Solo: checkout → node 22 → pnpm 11 → install → prisma generate → build backend → test backend
```

## Problemas de CI/CD

1. **No incluye `micro-frontend`** como branch trigger (rama actual de desarrollo)
2. **No build ni lint** de ningún frontend (shell o MFEs)
3. **No typecheck** de packages compartidos
4. **No test** de ningún MFE
5. **No lint** del backend
6. **Sin deployment workflow**
7. **Sin release workflow**
8. **Sin dependabot/renewate**

## Docker

### Dockerfile
- Multi-stage build: builder (build + generate) → runner (prod install)
- Solo para backend
- Sin frontend

### docker-compose.yml
- `postgres:16-alpine` con healthcheck
- `backend` con build desde Dockerfile
- **Sin servicios de frontend** (shell + MFEs)

### Falta
- Dockerfile/nginx para el shell + MFEs
- Health check para backend service
- Network isolation
- Volume para prisma migrations en runtime
- Environment-specific configs

## Infraestructura

- `infra/` — **vacío** (sin Terraform, Pulumi, K8s, etc.)
- `scripts/` — **vacío** (sin build/deploy scripts)
- No hay configuración de ningún cloud provider

---

# 10. UX

## Flujos por Rol

### OWNER
| Flujo | Estado | Observaciones |
|-------|--------|---------------|
| Login | ✅ | Funcional |
| Dashboard con métricas | ✅ | Stats + gráfico + actividad |
| Gestión de tenants | ✅ | Listado funcional |
| Gestión de sucursales | ⚠️ | Solo listado, sin CRUD |
| Gestión de usuarios | ⚠️ | Solo listado, sin CRUD |
| Reportes | 🔴 | Placeholder "En construcción" |
| Configuración | ⚠️ | Parcial |

### ADMIN
| Flujo | Estado | Observaciones |
|-------|--------|---------------|
| Login | ✅ | Funcional |
| Dashboard | ✅ | Stats, gráfico, actividad |
| Gestión de menús | ⚠️ | Listado con tarjetas, sin CRUD |
| Gestión de categorías | ⚠️ | Listado, sin CRUD |
| Gestión de inventario | ⚠️ | Listado, sin CRUD |
| Gestión de usuarios | ⚠️ | Solo listado |
| Gestión de reservaciones | ⚠️ | Listado y cancelación, sin creación |
| Reportes de ventas | 🔴 | Placeholder |
| Analytics | 🔴 | Placeholder |

### MANAGER
| Flujo | Estado | Observaciones |
|-------|--------|---------------|
| Login | ✅ | Funcional |
| Pedidos (waiter view) | ✅ | Listado con filtros |
| Mesas | ✅ | Vista de mesas funcional |
| Reservaciones | ⚠️ | Listado, sin creación |
| Cocina | ✅ | KDS funcional |

### WAITER
| Flujo | Estado | Observaciones |
|-------|--------|---------------|
| Login | ✅ | Funcional |
| Mesas | ✅ | Selección de mesa |
| Crear orden | ✅ | POS funcional |
| Ver pedidos | ✅ | Listado con filtros |
| Cocina | ✅ | KDS (solo visualización) |
| Reservaciones | ⚠️ | Solo listado |

### CASHIER
| Flujo | Estado | Observaciones |
|-------|--------|---------------|
| Login | ✅ | Funcional |
| POS | ✅ | Carrito, selección de mesa, catálogo |
| Procesar pago | ✅ | Efectivo, tarjeta, QR |
| Dividir cuenta | 🔴 | No implementado |
| Propinas | 🔴 | No implementado |
| Descuentos | 🔴 | No implementado |

### KITCHEN_STAFF / CHEF
| Flujo | Estado | Observaciones |
|-------|--------|---------------|
| Login | ✅ | Funcional |
| Cola de cocina | ✅ | Kanban: Nuevos → En preparación → Listos |
| Cambiar estado | ✅ | Con event emission |
| Temporizador | ✅ | Con alerta overdue (>15 min) |
| Priorización | 🔴 | No implementado |
| Alertas sonoras | 🔴 | No implementado |

## UI Inconsistente

1. **Dashboard-mf** y **web-shell** tienen layouts duplicados — la experiencia visual puede diferir
2. **reports-mf** muestra "Módulo en construcción" en 3 de 4 páginas
3. **Inconsistencia de unwrap** — algunos MFEs muestran datos correctos, otros fallan silenciosamente
4. **Branch Selector** — 3 implementaciones diferentes dan UX inconsistente

---

# 11. Deuda Técnica

## Alta Prioridad

| # | Problema | Impacto | Complejidad | Archivos Afectados | Rama Sugerida |
|---|----------|---------|-------------|-------------------|---------------|
| DT-01 | Imports filesystem entre MFEs rompen independencia | Imposible despliegue independiente | Media | `reservations-mf/ReservationModal.tsx`, `dashboard-mf/App.tsx` | `fix/cross-mfe-imports` |
| DT-02 | Código muerto en shell (~1,100 líneas) | Confusión, mantenimiento, bundle | Baja | `web-shell/src/services/*`, `hooks/*`, `components/admin/dashboard/*` | `refactor/shell-cleanup` |
| DT-03 | `cn()` duplicado 7 veces | Divergencia de implementación | Baja | 6 `utils.ts` + `packages/ui/src/cn.ts` | `refactor/shared-utils` |
| DT-04 | `.d.ts` desincronizados en 3 packages | Errores de tipo, confusión | Baja | `packages/types/src/index.d.ts`, `packages/ui/src/index.d.ts`, `packages/event-bus/src/events.d.ts` | `fix/sync-dts-files` |
| DT-05 | Sin Error Boundaries | White screen en crash de MFE | Baja | `web-shell/src/app/` | `fix/error-boundaries` |
| DT-06 | CORS bug en main.ts | Orígenes no permitidos | Baja | `apps/backend/src/main.ts:25` | `fix/cors-bug` |
| DT-07 | JWT parsing manual en reports-mf | Ruptura silenciosa | Baja | `reports-mf/src/services/reports.service.ts` | `fix/reports-jwt-parsing` |

## Media Prioridad

| # | Problema | Impacto | Complejidad | Archivos Afectados | Rama Sugerida |
|---|----------|---------|-------------|-------------------|---------------|
| DT-08 | 3 mecanismos de branch state | Inconsistencia, bugs | Media | `reports-mf`, `kitchen-mf`, `cashier-mf`, `@maison/ui` | `refactor/standardize-branch` |
| DT-09 | Hook boilerplate duplicado 8+ veces | Mantenimiento exponencial | Media | Todos los `hooks/use*.ts` | `refactor/shared-hooks` |
| DT-10 | Dashboard-mf con layout propio | Violación SOFEA | Media | `dashboard-mf/src/components/layout/*` | `refactor/remove-mfe-layouts` |
| DT-11 | Status badge maps duplicados | Inconsistencia visual | Media | Todos los MFEs con status | `refactor/shared-status-components` |
| DT-12 | Inconsistencia de API response unwrapping | Bugs intermitentes | Media | `orders-mf`, `cashier-mf`, `tables-mf`, `kitchen-mf` | `fix/standardize-api-responses` |
| DT-13 | TransformInterceptor inconsistente | Formato de respuesta variable | Media | `apps/backend/src/main.ts` | `fix/global-transform-interceptor` |
| DT-14 | UserRole enum duplicado 3 veces | Confusión de tipos | Baja | backend DTOs, `@maison/types`, Prisma schema | `fix/unify-user-role-enum` |
| DT-15 | `noImplicitAny: false` en backend | Pérdida de seguridad de tipos | Baja | `apps/backend/tsconfig.json` | `fix/enable-no-implicit-any` |
| DT-16 | Sin workspace-level tsconfig/eslint/prettier | Inconsistencia de código | Media | Raíz del monorepo | `chore/workspace-configs` |

## Baja Prioridad

| # | Problema | Impacto | Complejidad | Archivos Afectados | Rama Sugerida |
|---|----------|---------|-------------|-------------------|---------------|
| DT-17 | BranchesService vacío | Código muerto | Baja | `apps/backend/src/branches/dto/` | `fix/remove-empty-dtos` |
| DT-18 | ReservationsModule provee TenantPrismaService innecesariamente | Ruido | Baja | `reservations/reservations.module.ts` | `fix/remove-redundant-providers` |
| DT-19 | CSS y assets boilerplate de Next.js | Confusión | Baja | `web-shell/src/app/page.module.css`, `web-shell/public/*` | `chore/remove-boilerplate` |
| DT-20 | `page.module.css` sin usar | Dead code | Baja | `web-shell/src/app/page.module.css` | `chore/remove-boilerplate` |
| DT-21 | `README.md` del shell es boilerplate | Confusión | Baja | `apps/web-shell/README.md` | `chore/custom-readme` |
| DT-22 | Sin `.env.example` en web-shell | DX | Baja | `apps/web-shell/` | `chore/shell-env-example` |
| DT-23 | Port 5014 para tables fuera de rango | Inconsistencia | Baja | `federation.ts`, `tables-mf/vite.config.ts` | `fix/tables-port` |
| DT-24 | `console.error` en producción | Leak de información | Baja | 4 archivos en MFEs | `fix/remove-console-error` |
| DT-25 | POSPage monolito (~1,000 líneas) | Mantenibilidad | Alta | `cashier-mf/src/pages/POSPage.tsx` | `refactor/pospage-split` |
| DT-26 | `build:mfes` no incluye `tables-mf` | Build incompleto | Baja | `package.json:30` | `fix/build-mfes-tables` |
| DT-27 | `tsconfig.json` de paquetes apunta a `apps/frontend/` | Path incorrecto | Baja | `packages/event-bus/tsconfig.json`, `packages/ui/tsconfig.json` | `fix/tsconfig-typeroots` |

---

# 12. Backlog Recomendado

## Fase 1: Crítico (Antes del primer despliegue)

| Prioridad | Rama | Descripción |
|-----------|------|-------------|
| 1 | `fix/cross-mfe-imports` | Eliminar imports filesystem entre MFEs. Exponer vía Module Federation o duplicar localmente |
| 2 | `fix/cors-bug` | Corregir string de CORS en `main.ts:25` |
| 3 | `fix/error-boundaries` | Agregar ErrorBoundary en shell para cada grupo de rutas |
| 4 | `fix/sync-dts-files` | Eliminar `.d.ts` stale o regenerar desde source |
| 5 | `fix/reports-jwt-parsing` | Usar `@maison/auth-client` en reports-mf |
| 6 | `fix/standardize-api-responses` | Unificar unwrap de respuestas en todos los MFEs |

## Fase 2: Importante (Mejoras de arquitectura)

| Prioridad | Rama | Descripción |
|-----------|------|-------------|
| 7 | `refactor/shell-cleanup` | Eliminar código muerto del shell (~1,100 líneas) |
| 8 | `refactor/shared-utils` | Crear `packages/utils` con cn, formatCurrency, etc. |
| 9 | `refactor/standardize-branch` | Unificar BranchProvider en todos los MFEs |
| 10 | `refactor/shared-hooks` | Crear `usePaginatedQuery` genérico |
| 11 | `refactor/remove-mfe-layouts` | Eliminar layouts duplicados de dashboard-mf |
| 12 | `fix/global-transform-interceptor` | Aplicar TransformInterceptor globalmente |
| 13 | `fix/unify-user-role-enum` | Eliminar duplicación de UserRole |

## Fase 3: Calidad (Robustez)

| Prioridad | Rama | Descripción |
|-----------|------|-------------|
| 14 | `fix/enable-no-implicit-any` | Habilitar `noImplicitAny` en backend |
| 15 | `chore/workspace-configs` | Agregar tsconfig base, eslint, prettier compartidos |
| 16 | `fix/remove-empty-dtos` | Limpiar DTOs vacíos |
| 17 | `fix/build-mfes-tables` | Agregar tables-mf al build secuencial |
| 18 | `fix/remove-console-error` | Reemplazar console.error por logging estructurado |
| 19 | `refactor/shared-status-components` | Crear StatusBadge compartido en @maison/ui |

## Fase 4: Testing

| Prioridad | Rama | Descripción |
|-----------|------|-------------|
| 20 | `test/backend-unit-tests` | Tests unitarios para todos los services |
| 21 | `test/backend-e2e-completo` | E2E tests para todos los endpoints |
| 22 | `test/mfe-service-tests` | Tests para servicios de cada MFE |
| 23 | `test/mfe-component-tests` | Tests de rendering para componentes principales |
| 24 | `test/integration-eventbus` | Tests de comunicación inter-MFE |
| 25 | `test/e2e-playwright` | Tests end-to-end con Playwright |

## Fase 5: Funcionalidad

| Prioridad | Rama | Descripción |
|-----------|------|-------------|
| 26 | `feat/reports-implementation` | Implementar reportes con datos reales |
| 27 | `feat/menu-crud` | CRUD completo de productos y categorías |
| 28 | `feat/branch-crud` | CRUD de sucursales |
| 29 | `feat/user-management` | Gestión completa de usuarios |
| 30 | `feat/reservation-creation` | Formulario de creación de reservaciones |
| 31 | `feat/order-status-transitions` | Cambio de estado y cancelación en orders-mf |
| 32 | `feat/cashier-advanced` | Propinas, descuentos, división de cuentas |
| 33 | `feat/kitchen-advanced` | Priorización, alertas sonoras |

## Fase 6: DevOps

| Prioridad | Rama | Descripción |
|-----------|------|-------------|
| 34 | `chore/ci-frontend` | Agregar build/lint/typecheck de frontend a CI |
| 35 | `chore/docker-frontend` | Dockerfile + nginx para shell + MFEs |
| 36 | `chore/ci-add-mfe-branch` | Agregar `micro-frontend` como branch trigger |
| 37 | `chore/deploy-workflow` | GitHub Actions de deployment |
| 38 | `chore/pre-commit-hooks` | Agregar husky + lint-staged |

## Fase 7: Optimización

| Prioridad | Rama | Descripción |
|-----------|------|-------------|
| 39 | `perf/backend-caching` | Implementar cache para datos de solo lectura |
| 40 | `perf/memoization` | Agregar React.memo/useMemo a componentes pesados |
| 41 | `perf/pospage-split` | Refactorizar POSPage en componentes más pequeños |
| 42 | `refactor/pospage-split` | Extraer CartPanel, TableSelector, PaymentForm |

---

# 13. Checklist Final

| Componente | Estado | Completitud % | Listo para Producción | Observaciones |
|------------|--------|:------------:|:---------------------:|---------------|
| **Backend - Auth** | ✅ Funcional | 95% | Sí | JWT + refresh + voice auth completo |
| **Backend - Orders** | ✅ Funcional | 90% | Sí | CRUD + status transitions |
| **Backend - Payments** | ✅ Funcional | 90% | Sí | Split payments + tips + idempotency |
| **Backend - Kitchen** | ✅ Funcional | 85% | Sí | KDS + WebSocket + polling fallback |
| **Backend - Tenants** | ✅ Funcional | 80% | Sí | CRUD básico, falta suspend/activate flow |
| **Backend - Users** | ✅ Funcional | 85% | Sí | CRUD + invite + status changes |
| **Backend - Branches** | ✅ Funcional | 80% | Sí | CRUD + stats |
| **Backend - Menus** | ✅ Funcional | 85% | Sí | CRUD + price update + status |
| **Backend - Categories** | ✅ Funcional | 80% | Sí | CRUD + stats |
| **Backend - Reservations** | ✅ Funcional | 85% | Sí | CRUD + status transitions |
| **Backend - Reports** | ✅ Funcional | 80% | Sí | Sales/products/payments/peak-hours + CSV |
| **Backend - Tables** | ✅ Funcional | 75% | Sí | Status management básico |
| **Backend - Discounts** | ✅ Funcional | 80% | Sí | CRUD + code uniqueness |
| **Backend - Promotions** | ✅ Funcional | 80% | Sí | CRUD básico |
| **Backend - Activity Log** | ✅ Funcional | 75% | Sí | Best-effort logging |
| **Backend - Health** | ✅ Funcional | 100% | Sí | Health check simple |
| **Web Shell** | ⚠️ Funcional | 90% | No | Código muerto masivo, sin error boundaries |
| **auth-mf** | ✅ Funcional | 95% | Sí | Login + forgot-password + tests |
| **dashboard-mf** | ⚠️ Funcional | 80% | No | Layout duplicado, CRUD pendiente |
| **menu-mf** | ⚠️ Funcional | 75% | No | CRUD de productos/categorías pendiente |
| **orders-mf** | ⚠️ Funcional | 80% | No | Status transitions pendientes |
| **kitchen-mf** | ✅ Funcional | 85% | Sí | KDS funcional |
| **cashier-mf** | ⚠️ Funcional | 80% | No | POSPage monolito, propinas/descuentos pendientes |
| **reports-mf** | 🔴 Placeholder | 30% | No | 3 de 4 páginas sin implementar |
| **reservations-mf** | ⚠️ Funcional | 85% | No | Import directo de tables-mf |
| **tables-mf** | ⚠️ Funcional | 85% | No | `window.location.href` para reload |
| **@maison/types** | ⚠️ Completo | 90% | Sí | `.d.ts` desincronizado |
| **@maison/ui** | ⚠️ Parcial | 70% | Sí | `.d.ts` desincronizado, falta BranchSelector |
| **@maison/event-bus** | ⚠️ Completo | 85% | Sí | `.d.ts` desincronizado |
| **@maison/api-client** | ✅ Completo | 95% | Sí | Sync correcto |
| **@maison/auth-client** | ✅ Completo | 90% | Sí | Sin `.d.ts` (no necesita) |
| **Pruebas backend** | 🔴 Insuficiente | 15% | No | 1 unit test, 7 e2e |
| **Pruebas frontend** | 🔴 Insuficiente | 10% | No | Solo auth-mf y reservations-mf |
| **CI/CD** | 🔴 Básico | 20% | No | Solo build+test backend |
| **Docker** | ⚠️ Parcial | 40% | No | Solo backend, sin frontend |
| **Documentación** | ⚠️ Aceptable | 60% | Sí | README exhaustivo, falta docs técnicas |
| **Infraestructura** | 🔴 Vacío | 5% | No | `infra/` y `scripts/` vacíos |

---

# Recomendación

## Qué Haría Primero (Semana 1)

1. **`fix/cross-mfe-imports`** — Es el blocker #1. Sin esto, no hay despliegue independiente. Es un fix de complejidad media (2-3 horas).

2. **`fix/cors-bug`** — Fix de 5 minutos que tiene impacto de seguridad.

3. **`fix/error-boundaries`** — Agregar 3-4 `error.tsx` files. Complejidad baja, impacto alto.

4. **`fix/sync-dts-files`** — Eliminar los `.d.ts` stale (5 minutos). No se usan.

5. **`refactor/shell-cleanup`** — Eliminar ~1,100 líneas de código muerto. Confusión reducida.

## Qué No Tocaría

- **El backend completo** — Está sólido. Los 16 módulos están bien estructurados, Prisma schema es correcto, la arquitectura multi-schema funciona. No refactorizaría nada aquí a menos que haya un bug específico.

- **La arquitectura de Module Federation** — La configuración de federation.ts, RemoteLoader, y el bridge logic están bien diseñados. No cambiaría la estrategia.

- **Los paquetes compartidos** — Su dependencia unidireccional (`types` → `auth-client`/`event-bus` → `ui` → `api-client`) es correcta. Solo corregiría los `.d.ts`.

- **El event-bus** — 16 eventos tipados con namespace `maison:` es una implementación limpia. No le cambiaría nada.

## Qué Puede Esperar

- **Propinas, descuentos, división de cuentas** (cashier-mf) — Funcionalidades nice-to-have que no bloquean un MVP funcional.

- **Reports con datos reales** — Puede esperar hasta que el backend tenga datos suficientes en producción.

- **Priorización y alertas sonoras en cocina** — El KDS funciona sin esto.

- **Workspace-level configs (eslint, prettier, husky)** — Importante para DX pero no bloqueante.

- **Infraestructura (Terraform, K8s)** — Podría desplegarse con Docker Compose + un VPS inicialmente.

## Qué es Indispensable Antes del Primer Despliegue

1. **Fix cross-MFE imports** — Sin esto, el sistema no puede desplegarse de forma distribuida.
2. **Fix CORS bug** — Sin esto, el frontend no puede comunicarse con el backend en producción.
3. **Error boundaries** — Sin esto, un crash en cualquier MFE destruye toda la sesión.
4. **Eliminar `.d.ts` stale** — Puede causar tipos erróneos en producción.
5. **Fix reports-mf JWT parsing** — Usa `'access_token'` en vez de `'maison_access_token'` — rompe en producción.
6. **CI incluya `micro-frontend` branch** — El pipeline actual no cubre la rama de desarrollo.
7. **Docker para frontend** — Sin esto, no hay forma de desplegar el shell + MFEs.

---

**Documento generado por auditoría técnica.**
**Recomendación: abordar los issues de Fase 1 (Crítico) antes de cualquier despliegue.**
