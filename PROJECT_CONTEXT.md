# AuraRest Multitenant - Contexto del Proyecto

**Última actualización:** 2026-08-05  
**Rama actual:** `refactor-system-mf`  
**Estado:** En desarrollo activo con refactorización de arquitectura  

---

## 📋 Resumen Ejecutivo

**AuraRest Multitenant** es una **plataforma SaaS para administración de restaurantes** con arquitectura SOFEA (Service Oriented Front-End Architecture) basada en **Microfrontends federados** y backend NestJS.

| Aspecto | Descripción |
|---------|------------|
| **Propósito** | Sistema de gestión integral para restaurantes multi-sucursal |
| **Arquitectura** | Monorepo con pnpm workspaces + Module Federation (Vite 6 + Next.js 16) |
| **Tecnología Frontend** | React 19 + TypeScript + Tailwind CSS |
| **Tecnología Backend** | NestJS 11 + Prisma 6 + PostgreSQL |
| **Estado actual** | 85% frontend completo, 10% backend implementado |
| **Tamaño del equipo** | 1 desarrollador (AngelAkagami) |
| **Entorno** | Desarrollo local en Windows 11 |

---

## 🏗️ Estructura del Proyecto

### Directorio raíz
```
AuraRestMultitenant/
├── apps/
│   ├── backend/                           # NestJS API REST (:3000) — scaffolding inicial
│   ├── web-shell/                         # Next.js 16 Host (:3030) — orquestador de MFEs
│   ├── core_auth_dashboard_mf/            # Agrupado: Auth + Dashboard (Vite, :5011)
│   ├── orders_tables_mf/                  # Agrupado: Órdenes + Mesas (Vite, :5012)
│   ├── reservations_reports_mf/           # Agrupado: Reservaciones + Reportes (Vite, :5013)
│   ├── kitchen-mf/                        # KDS Cocina (Vite, :5005) — lazy load
│   ├── cashier-mf/                        # POS Caja (Vite, :5006) — lazy load
│   ├── menu-mf/                           # Gestión de menú (Vite, :5003) — lazy load
│   └── [LEGACY] mfe-admin/                # DEPRECADO — se eliminará al final
│
├── packages/                              # Paquetes compartidos
│   ├── types/                             # @maison/types — tipos de dominio
│   ├── api-client/                        # @maison/api-client — cliente HTTP tipado
│   ├── ui/                                # @maison/ui — design system (componentes)
│   ├── event-bus/                         # @maison/event-bus — comunicación entre MFEs
│   └── auth-client/                       # @maison/auth-client — gestión de tokens JWT
│
├── scripts/                               # Scripts de automatización (NUEVO)
├── docs/                                  # Documentación (vacío)
├── infra/                                 # Infraestructura (vacío)
├── .env.example                           # Variables de entorno de referencia
├── package.json                           # Scripts globales y configuración del monorepo
├── pnpm-workspace.yaml                    # Definición de workspaces
└── README.md                              # Documentación principal (actualizada)
```

### Aplicaciones por función

| App | Tipo | Ruta | Puerto | Propósito |
|-----|------|------|--------|----------|
| **web-shell** | Host | `apps/web-shell` | 3030 | Orquestador central que carga MFEs dinámicamente |
| **core_auth_dashboard_mf** | Remote (Agrupado) | `apps/core_auth_dashboard_mf` | 5011 | Autenticación + Dashboard principal |
| **orders_tables_mf** | Remote (Agrupado) | `apps/orders_tables_mf` | 5012 | Monitor de órdenes + Gestión de mesas |
| **reservations_reports_mf** | Remote (Agrupado) | `apps/reservations_reports_mf` | 5013 | Reservaciones + Reportes/Analytics |
| **kitchen-mf** | Remote (Lazy) | `apps/kitchen-mf` | 5005 | Kitchen Display System (KDS) — Cocina |
| **cashier-mf** | Remote (Lazy) | `apps/cashier-mf` | 5006 | Point of Sale (POS) — Caja registradora |
| **menu-mf** | Remote (Lazy) | `apps/menu-mf` | 5003 | Gestión de catálogo de productos |
| **backend** | API | `apps/backend` | 3000 | NestJS REST API con Prisma + PostgreSQL |

---

## 🔄 Estado Actual de la Rama `refactor-system-mf`

### Cambios en progreso

La rama `refactor-system-mf` está **refactorizando la arquitectura de Module Federation** para optimizar tiempos de carga:

#### ✅ Completado en esta rama:
1. **Agrupación de MFEs**: Tres apps ahora agrupan múltiples módulos:
   - `core_auth_dashboard_mf` = auth-mf + dashboard-mf (expone `./AuthApp` y `./DashboardApp`)
   - `orders_tables_mf` = orders-mf + tables-mf (expone `./OrdersApp` y `./TablesApp`)
   - `reservations_reports_mf` = reservations-mf + reports-mf (expone `./ReservationsApp` y `./ReportsApp`)

2. **Lazy Loading**: Tres MFEs se cargan bajo demanda:
   - `kitchen-mf`, `cashier-mf`, `menu-mf` — se cargan solo cuando el usuario accede a sus rutas

3. **Actualización de configuración**:
   - `vite.config.ts` modificado en todas las apps agrupadas
   - `main.tsx` actualizados en los puntos de entrada
   - `federation.ts` (web-shell) actualizado con nuevos remotos

#### 📝 Cambios sin commit (en staging o sin seguimiento):
```
 M .env.example
 M apps/cashier-mf/src/main.tsx
 M apps/cashier-mf/vite.config.ts
 M apps/core_auth_dashboard_mf/index.html
 M apps/core_auth_dashboard_mf/src/auth/main.tsx
 M apps/core_auth_dashboard_mf/src/dashboard/main.tsx
 M apps/core_auth_dashboard_mf/vite.config.ts
 M apps/kitchen-mf/src/main.tsx
 M apps/kitchen-mf/vite.config.ts
 M apps/menu-mf/src/main.tsx
 M apps/menu-mf/vite.config.ts
 M apps/orders_tables_mf/index.html
 M apps/orders_tables_mf/src/orders/main.tsx
 M apps/orders_tables_mf/src/tables/main.tsx
 M apps/orders_tables_mf/vite.config.ts
 M apps/reservations_reports_mf/index.html
 M apps/reservations_reports_mf/src/reports/main.tsx
 M apps/reservations_reports_mf/src/reservations/main.tsx
 M apps/reservations_reports_mf/vite.config.ts
 M apps/web-shell/src/components/shell/AuthGuard.tsx
 M apps/web-shell/src/components/shell/RemoteLoader.tsx
 M apps/web-shell/src/lib/federation.ts
 M package.json
 M packages/api-client/src/client.ts
?? apps/core_auth_dashboard_mf/src/main.tsx (nuevo archivo)
?? apps/orders_tables_mf/src/main.tsx (nuevo archivo)
?? apps/reservations_reports_mf/src/main.tsx (nuevo archivo)
?? scripts/ (nueva carpeta)
```

#### 🔨 Lo que necesita terminarse:
1. **Compilar y validar** todos los MFEs agrupados
2. **Testear navegación** entre MFEs y lazy-loading
3. **Verificar comunicación** via event-bus en nueva arquitectura
4. **Commit y merge** a `dev` (después a `main`)

---

## ✨ Funcionalidades Implementadas

### Frontend (85% completo)

#### Shell (web-shell)
- ✅ Layout administrativo con navegación lateral
- ✅ Protección de rutas via `AuthGuard`
- ✅ Carga dinámica de MFEs via `RemoteLoader`
- ✅ Contexto global: Rama (sucursal) + Tema (claro/oscuro)
- ✅ Module Federation con 6 remotos (3 precargados + 3 lazy)

#### Autenticación (core_auth_dashboard_mf - auth)
- ✅ Formulario de login
- ✅ Recuperación de contraseña
- ✅ Gestión de tokens JWT en `localStorage`
- ✅ Eventos de autenticación (`auth:login`, `auth:logout`)
- ❌ Registro de nuevos usuarios
- ❌ Autenticación 2FA

#### Dashboard (core_auth_dashboard_mf - dashboard)
- ✅ Panel con métricas (sucursales, usuarios, ingresos, rating)
- ✅ Gráfico de ingresos por mes
- ✅ Feed de actividad reciente
- ✅ Tabla de sucursales y usuarios
- ✅ Selector de sucursal (emite `branch:changed`)
- ✅ Página de configuración (formulario placeholder)
- ❌ CRUD completo de sucursales
- ❌ Gestión dinámica de usuarios

#### Menú (menu-mf)
- ✅ Listado de productos con tarjetas visuales
- ✅ Filtros por estado (disponible, no disponible, sin stock)
- ✅ Búsqueda de productos
- ✅ Métricas del menú
- ✅ Vista de categorías (placeholder)
- ❌ CRUD completo de productos
- ❌ Gestión de inventario
- ❌ Subida de imágenes

#### Órdenes (orders_tables_mf - orders)
- ✅ Listado de órdenes en tiempo real
- ✅ Filtros por estado
- ✅ Búsqueda por número/cliente
- ✅ Métricas del día
- ❌ Cambio de estado de órdenes
- ❌ Cancelación de órdenes

#### Mesas (orders_tables_mf - tables)
- ✅ Vista de mesas con estado (libre, ocupada, reservada, mantenimiento)
- ❌ Edición de estado
- ❌ Asignación de órdenes

#### Cocina / KDS (kitchen-mf)
- ✅ Kanban: Nuevos | En preparación | Listos
- ✅ Temporizador con alerta de overdue (>15 min)
- ✅ WebSocket con fallback a polling (30s)
- ✅ Cambio de estado de tickets (new → in_progress → ready)
- ❌ Alertas sonoras
- ❌ Impresión de comandas
- ❌ Priorización de órdenes

#### Caja / POS (cashier-mf)
- ✅ Selección de mesas
- ✅ Catálogo de productos con búsqueda y filtros
- ✅ Carrito lateral con totales
- ✅ Cálculo de IVA (16%)
- ✅ Procesamiento de pagos (efectivo, tarjeta, QR)
- ✅ Emisión de `order:created` y `payment:completed`
- ❌ División de cuentas
- ❌ Propinas
- ❌ Descuentos y promociones
- ❌ Impresión de ticket

#### Reservaciones (reservations_reports_mf - reservations)
- ✅ Listado de reservaciones
- ✅ Filtros por estado
- ✅ Búsqueda
- ✅ Métricas del día
- ✅ Cancelación de reservaciones
- ❌ Creación de nuevas reservaciones
- ❌ Confirmación de reservaciones
- ❌ Vista de calendario funcional

#### Reportes (reservations_reports_mf - reports)
- ❌ **Completamente en placeholder** — sin datos reales
- ❌ Reportes de ventas
- ❌ Analytics
- ❌ Logs del sistema
- ❌ Gestión de integraciones

### Backend (10% completo)

El backend NestJS apenas tiene scaffolding inicial:

- ✅ Configuración básica de NestJS 11
- ✅ Estructura de módulos (auth, admin, kitchen, cashier, orders, reservations, reports)
- ✅ Prisma 6 configurado con 2 bases de datos:
  - `system` — info de tenants y super admins
  - `tenant` — datos de cada restaurante
- ❌ **Ningún endpoint implementado** — solo `GET /` que devuelve "Hello World"
- ❌ Autenticación JWT con refresh tokens
- ❌ WebSocket para kitchen-mf
- ❌ Migraciones de base de datos
- ❌ Seeding de datos
- ❌ Validación y autorización

### Paquetes Compartidos (100% completo)

- ✅ `@maison/types` — tipos de dominio (User, Order, Menu, Reservation, etc.)
- ✅ `@maison/ui` — componentes reutilizables (StatCard, Skeleton, EmptyState, Icons)
- ✅ `@maison/api-client` — cliente HTTP con interceptores
- ✅ `@maison/event-bus` — sistema de eventos tipados (emit/on)
- ✅ `@maison/auth-client` — gestión de tokens JWT

---

## 🚨 CRÍTICO — Lo Que Hace Falta (Por Gravedad)

### 🔴 CRÍTICO - Sin esto, el proyecto no funciona

| ID | Problema | Impacto | Solución | Esfuerzo |
|----|---------| --------|---------|----------|
| **C1** | **Backend no implementado** | Todas las MFEs consumen APIs que no existen. El sistema es 100% frontend sin datos reales. | Implementar todos los endpoints NestJS + autenticación JWT + WebSocket | 80h |
| **C2** | **Base de datos sin configurar** | No hay base de datos PostgreSQL. Las migraciones Prisma no se han ejecutado. | Configurar PostgreSQL, correr migraciones, seedear datos iniciales | 8h |
| **C3** | **Cambios sin commit en refactor** | La rama tiene cambios importantes sin guardar. Riesgo de pérdida de trabajo. | Hacer commit de todos los cambios en `refactor-system-mf` | 1h |

### 🟠 ALTO - Estos impiden el desarrollo normal

| ID | Problema | Impacto | Solución | Esfuerzo |
|----|---------| --------|---------|----------|
| **H1** | **Reportes totalmente vacíos** | Funcionalidad de analytics/reporting no existe | Implementar reportes, gráficos y exportación (CSV/PDF) | 20h |
| **H2** | **CRUD de productos incompleto** | No se pueden crear/editar/eliminar productos | Formularios + endpoints en backend | 12h |
| **H3** | **Gestión de usuarios y sucursales** | Dashboard no tiene funcionalidad completa | Implementar CRUD en frontend + backend | 15h |
| **H4** | **WebSocket en kitchen-mf** | La URL `ws://localhost:3001/kitchen/queue` no existe | Implementar WebSocket en NestJS con Socket.io o ws | 10h |
| **H5** | **Autenticación sin validación real** | Los endpoints de login no validan credenciales contra BD | Implementar AuthController en NestJS + JWT | 8h |

### 🟡 MEDIO - Mejoran la experiencia pero no bloquean

| ID | Problema | Impacto | Solución | Esfuerzo |
|----|---------| --------|---------|----------|
| **M1** | **Sin pruebas automatizadas** | No hay garantía de que los cambios no rompan nada | Agregar Jest + pruebas unitarias e integración | 25h |
| **M2** | **Propinas y división de cuentas** | POS/cashier está incompleto | Implementar lógica de propinas y split payment | 8h |
| **M3** | **Alertas sonoras en kitchen** | UX de cocina no notifica nuevas órdenes | Agregar audio y notificaciones | 3h |
| **M4** | **Impresión de tickets** | No se pueden imprimir órdenes o comandas | Integrar librería de impresión térmica | 6h |
| **M5** | **Eliminación de mfe-admin legacy** | Código muerto ocupa espacio | Remover directorio y referencias en workspace | 2h |
| **M6** | **Documentación incompleta** | Developers nuevos no saben cómo trabajar en el proyecto | Completar README, crear ADRs (Architecture Decision Records) | 5h |
| **M7** | **Errores TYPE-001 en Module Federation** | Warnings en build sobre tipos TypeScript no generados | Revisar tsconfig en MFEs | 3h |

---

## 📊 Estado por Componente

### Completitud General

```
Frontend:        ████████░░ 85%
Backend:         █░░░░░░░░░ 10%
Infrastructure:  ░░░░░░░░░░  0%
Testing:         ░░░░░░░░░░  0%
Documentation:   ██░░░░░░░░ 20%
```

### Por Microfrontend

| MFE | Compl. | Estado | Bloqueantes |
|-----|--------|--------|-------------|
| web-shell | 90% | 🟢 Listo | Ninguno |
| core_auth_dashboard_mf (auth) | 80% | 🟡 Parcial | Endpoint de login sin validación |
| core_auth_dashboard_mf (dashboard) | 75% | 🟡 Parcial | CRUD de usuarios/sucursales |
| orders_tables_mf (orders) | 80% | 🟡 Parcial | Cambio de estado de órdenes |
| orders_tables_mf (tables) | 70% | 🟡 Parcial | Gestión de mesas |
| kitchen-mf | 85% | 🟢 Listo | WebSocket del backend |
| cashier-mf | 85% | 🟢 Listo | Propinas, split payment |
| menu-mf | 70% | 🟡 Parcial | CRUD de productos |
| reservations_reports_mf (reservations) | 75% | 🟡 Parcial | Calendario funcional |
| reservations_reports_mf (reports) | 10% | 🔴 Crítico | **Todo está en placeholder** |

---

## 📚 Tecnologías Utilizadas

| Capa | Tecnología | Versión | Notas |
|------|-----------|---------|-------|
| **Shell Host** | Next.js | 16.2.6 | SSG estático con `output: "export"` |
| **Microfrontends** | Vite | 6.3 | Bundler para remotes |
| **Lenguaje Frontend** | TypeScript | 5.7 | Tipado estático |
| **Librería UI** | React | 19.2 | SSR desactivado (SOFEA) |
| **Estilos** | Tailwind CSS | 3.4 | Utilidades + componentes custom |
| **Gestión de estado** | Hooks + Event Bus | - | Mínimo estado global |
| **Routing** | React Router | 7.x | En cada MFE independientemente |
| **Module Federation** | @module-federation/vite | 1.x | Para Vite |
| **Module Federation (shell)** | @module-federation/runtime | 2.x | Para Next.js |
| **Backend** | NestJS | 11.0 | Framework TypeScript para Node.js |
| **ORM** | Prisma | 6.0 | TypeScript ORM para PostgreSQL |
| **Base de datos** | PostgreSQL | 15+ | Sistema y tenant schemas |
| **Autenticación** | JWT | - | Tokens en localStorage |
| **Gestor de paquetes** | pnpm | 11.4+ | Workspaces y monorepo |
| **Herramientas** | concurrently | 9.x | Ejecución paralela de procesos |

---

## 🚀 Cómo Ejecutar el Proyecto

### Requisitos previos
```bash
Node.js >= 18
pnpm >= 11.4
PostgreSQL >= 15 (para desarrollo)
```

### Instalación
```bash
git clone <repo>
cd AuraRestMultitenant
pnpm install
```

### Variables de entorno
```bash
cp .env.example .env.local
# Editar .env.local con valores reales (URLs, secretos, BD)
```

### Desarrollo

**Opción 1: Stack completo (recomendado)**
```bash
pnpm dev:all
```
Levanta: shell (:3030) + 6 MFEs (:5001-5013) en paralelo.

**Opción 2: Solo MFEs precargados (más rápido)**
```bash
pnpm dev:host
```
Levanta: shell (:3030) + 3 remotos precargados (:5011-5013).

**Opción 3: Solo shell**
```bash
pnpm dev:shell
```
Levanta: shell (:3030) — carga MFEs bajo demanda.

**Opción 4: Backend**
```bash
cd apps/backend
npm install
npm run start:dev
```
Levanta: NestJS (:3000).

### Construcción
```bash
pnpm build          # Compila todos los MFEs + shell
pnpm build:mfes     # Solo MFEs
pnpm build:shell    # Solo shell
```

### Base de datos
```bash
pnpm db:setup       # Deploy migraciones + seed datos
pnpm db:seed        # Seed datos
pnpm db:seed:admin  # Seed super admin
```

---

## 📋 Plan de Trabajo Recomendado

### Fase 1: Estabilizar refactor (1-2 días)
1. ✅ Compilar backend (`npm run build`)
2. ⏳ Hacer commit de cambios en rama `refactor-system-mf`
3. ⏳ Validar que todos los MFEs agrupados se cargan
4. ⏳ Testear navegación entre MFEs
5. ⏳ Merge a `dev`

### Fase 2: Implementar Backend (10-15 días)
1. Configurar PostgreSQL y migraciones Prisma
2. Implementar AuthController + JWT
3. Implementar módulos: Admin, Orders, Kitchen, Cashier, Menu, Reservations, Reports
4. Agregar WebSocket para kitchen-mf
5. Seeding de datos iniciales

### Fase 3: Completar Frontend (10-15 días)
1. CRUD de productos (menu-mf)
2. Gestión de usuarios/sucursales (dashboard-mf)
3. Reportes y analytics (reports-mf)
4. Propinas y split payment (cashier-mf)
5. Calendario (reservations-mf)

### Fase 4: Testing e Integración (5-7 días)
1. Pruebas unitarias en MFEs
2. Pruebas de integración (event-bus, navegación)
3. Pruebas end-to-end (flujo completo)
4. Pruebas de autenticación/autorización

### Fase 5: Despliegue y Documentación (3-5 días)
1. CI/CD (GitHub Actions)
2. Docker para backend
3. Deployment strategy
4. Documentación final

**Tiempo total estimado: 30-45 días** (1-2 meses a tiempo completo)

---

## 🔗 Dependencias Entre Componentes

```
┌─────────────────────────────────────────────────────────────┐
│ PostgreSQL (Base de datos - NECESARIO)                      │
└──────────────────────────┬──────────────────────────────────┘
                          │
                    ┌─────▼─────┐
                    │  Backend   │ ← NestJS (:3000) [CRÍTICO]
                    │  NestJS    │
                    └─────┬──────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   ┌────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
   │  MFE APIs │  │  WebSocket  │  │   Auth JWT  │
   │ (REST)    │  │  (kitchen)  │  │ (validated) │
   └────┬──────┘  └──────┬──────┘  └──────┬──────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
        ┌────────────────▼─────────────────┐
        │  @maison/* (Shared packages)     │
        │  - types, api-client, auth,      │
        │  - event-bus, ui                 │
        └────────────────┬─────────────────┘
                         │
            ┌────────────┼────────────┐
            │            │            │
       ┌────▼──┐  ┌─────▼───┐  ┌────▼────┐
       │ Shell │  │  MFE    │  │  Other  │
       │ Host  │  │ Remotos │  │  MFEs   │
       └───────┘  └─────────┘  └─────────┘
```

**Dependencias críticas:**
1. **PostgreSQL** debe estar disponible
2. **Backend NestJS** debe responder en `:3000/api/v1`
3. **MFEs Remotos** deben estar cargados por el host
4. **Paquetes compartidos** deben ser transpilados correctamente

---

## 🐛 Problemas Conocidos

### 1. **Backend no implementado**
- **Síntoma:** MFEs muestran placeholders o errores al conectar
- **Causa:** Solo hay scaffolding en NestJS
- **Solución:** Implementar endpoints real
- **Prioridad:** 🔴 CRÍTICO

### 2. **Puerto 5002 duplicado (legacy)**
- **Síntoma:** `mfe-admin` y `dashboard-mf` comparten puerto
- **Causa:** Migración en progreso
- **Solución:** Eliminar `mfe-admin` cuando esté completo
- **Prioridad:** 🟠 ALTO

### 3. **Cambios sin commit en refactor**
- **Síntoma:** 20+ archivos modificados sin guardar
- **Causa:** Cambios en progreso en rama refactor-system-mf
- **Solución:** Revisar, testear y hacer commit
- **Prioridad:** 🔴 CRÍTICO

### 4. **Reportes en placeholder**
- **Síntoma:** Página de reportes no muestra datos
- **Causa:** No implementado
- **Solución:** Crear endpoints y componentes
- **Prioridad:** 🟠 ALTO

### 5. **WebSocket inexistente**
- **Síntoma:** kitchen-mf falla al conectar a WS
- **Causa:** No hay servidor WebSocket en backend
- **Solución:** Implementar con Socket.io o ws
- **Prioridad:** 🟠 ALTO (afecta kitchen-mf)

### 6. **Errores TYPE-001 en Module Federation**
- **Síntoma:** Warnings en build sobre tipos TypeScript
- **Causa:** tsconfig no está sincronizado
- **Solución:** Revisar typeRoots en paquetes compartidos
- **Prioridad:** 🟡 MEDIO

---

## 📞 Contacto / Responsabilidad

- **Developer:** AngelAkagami (usuario Git)
- **Email:** 20233tn143@utez.edu.mx
- **Rama activa:** `refactor-system-mf`
- **Estado:** Solo 1 desenvolvedor — trabajo independiente

---

## 📖 Recursos Adicionales

### Documentación principal
- `README.md` — Guía completa con diagrama de arquitectura
- `.env.example` — Variables de entorno necesarias

### Archivos importantes
- `pnpm-workspace.yaml` — Definición de workspaces
- `apps/web-shell/src/lib/federation.ts` — Configuración de Module Federation
- `apps/web-shell/src/lib/remoteMap.ts` — Mapeo de rutas a MFEs
- `apps/backend/prisma/` — Esquemas de BD (system + tenant)

### Referencias externas
- [Next.js Docs](https://nextjs.org)
- [Vite Docs](https://vitejs.dev)
- [NestJS Docs](https://docs.nestjs.com)
- [Prisma Docs](https://www.prisma.io/docs)
- [Module Federation Docs](https://module-federation.github.io)

---

## 📝 Notas Finales

### Por qué este proyecto es complejo

1. **Arquitectura SOFEA** — Frontend 100% client-side, sin SSR
2. **Module Federation** — Carga dinámica de código en tiempo de ejecución
3. **Multitenant** — Datos separados por tenant, complejidad SQL
4. **Tiempo real** — WebSocket para kitchen-mf
5. **Múltiples MFEs** — Coordinación entre 6+ aplicaciones independientes

### Recomendaciones clave

1. **Prioridad 1:** Hacer commit de los cambios actuales en refactor-system-mf
2. **Prioridad 2:** Implementar backend NestJS (80% del esfuerzo)
3. **Prioridad 3:** Agregar pruebas automatizadas
4. **Prioridad 4:** Documentar decisiones arquitectónicas (ADRs)
5. **Prioridad 5:** Configurar CI/CD

---

**Documento generado:** 2026-08-05  
**Versión del proyecto analizado:** rama `refactor-system-mf` con cambios sin commit
