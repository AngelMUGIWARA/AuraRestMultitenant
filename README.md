<div align="center">

# 🏛️ AuraRest Multitenant

**Plataforma de Administración Multitenant para Restaurantes**

<br />

[![Built with NestJS](https://img.shields.io/badge/NestJS-11-E0234E?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Module Federation](https://img.shields.io/badge/Module_Federation-MFE-FF6B35?style=flat-square)](https://module-federation.io/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![pnpm](https://img.shields.io/badge/pnpm-11-F69220?style=flat-square&logo=pnpm&logoColor=white)](https://pnpm.io/)
[![License](https://img.shields.io/badge/License-ISC-808080?style=flat-square)]()

</div>

---

## 📋 Tabla de Contenidos

- [Visión General](#-visión-general)
- [Arquitectura SOFEA + MFE](#-arquitectura-sofea--mfe)
- [Mapa de Puertos](#-mapa-de-puertos)
- [Mapa de Eventos (Event Bus)](#-mapa-de-eventos-event-bus)
- [Stack Tecnológico](#-stack-tecnológico)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Cómo Correr el Proyecto](#-cómo-correr-el-proyecto)
  - [Prerrequisitos](#prerrequisitos)
  - [Instalación](#instalación)
  - [Variables de Entorno](#variables-de-entorno)
  - [Modo Desarrollo — Todo en Paralelo](#modo-desarrollo--todo-en-paralelo)
  - [Modo Desarrollo — MFEs Individuales](#modo-desarrollo--mfes-individuales)
  - [Build de Producción](#build-de-producción)
- [Scripts Disponibles](#-scripts-disponibles)
- [Responsabilidades de Cada MFE](#-responsabilidades-de-cada-mfe)
- [Packages Compartidos](#-packages-compartidos)
- [Sistema de Diseño](#-sistema-de-diseño)
- [Patrones SOFEA](#-patrones-sofea)
- [Contribuir](#-contribuir)
- [Licencia](#-licencia)

---

## 🎯 Visión General

**AuraRest Multitenant** es una plataforma SaaS de administración para restaurantes implementada con **arquitectura SOFEA** (Service Oriented Front-End Architecture) y **Microfrontends** via Module Federation. La plataforma está diseñada para administrar múltiples restaurantes (tenants) con sus propias sucursales, carta, pedidos, cocina, caja y reservaciones, todo desde un único shell que orquesta 8 microfrontends independientes.

---

## 🏗️ Arquitectura SOFEA + MFE

```
┌─────────────────────────────────────────────────────────────────────┐
│                    pnpm Monorepo Workspace                           │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  web-shell  (Next.js · :3000)                                │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │  AuthGuard → comprueba @maison/auth-client           │   │   │
│  │  │  ThemeProvider → <html class="dark">                 │   │   │
│  │  │  federation.ts → registra 8 remotes                  │   │   │
│  │  │  AppRouter → <RemoteLoader remote="..." />           │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                               │                                      │
│       ┌───────────────────────┼──────────────────────────┐          │
│       │           Module Federation (ESM)                │          │
│       ▼           remoteEntry.js por cada MFE            ▼          │
│  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌────────┐ ┌────────────┐    │
│  │auth-mf  │ │dashboard │ │menu-mf │ │orders  │ │kitchen-mf  │    │
│  │  :5001  │ │   :5002  │ │  :5003 │ │  :5004 │ │   :5005    │    │
│  └─────────┘ └──────────┘ └────────┘ └────────┘ └────────────┘    │
│  ┌────────────┐ ┌────────────┐ ┌─────────────────┐                 │
│  │cashier-mf  │ │reports-mf  │ │ reservations-mf │                 │
│  │   :5006    │ │   :5007    │ │      :5008      │                 │
│  └────────────┘ └────────────┘ └─────────────────┘                 │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Packages compartidos (workspace:*)                          │   │
│  │  @maison/types · @maison/api-client · @maison/ui             │   │
│  │  @maison/event-bus · @maison/auth-client                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  apps/backend  (NestJS · :4000)                              │   │
│  │  API REST: /api/v1                                           │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

> **Principio SOFEA:** El `web-shell` es el único punto de entrada HTML y el único orquestador. Cada MFE posee su propio dominio de negocio, sus servicios REST y su estado local. La única comunicación entre MFEs es mediante el `@maison/event-bus` (Custom Events).

---

## 🗺️ Mapa de Puertos

| Puerto | App | Rol |
|:------:|:----|:----|
| **4000** | `apps/backend` | API REST NestJS |
| **3030** | `apps/web-shell` | Orquestador (Next.js) · *el 3000 suele estar ocupado* |
| **5001** | `apps/auth-mf` | Autenticación y sesión |
| **5002** | `apps/dashboard-mf` | Dashboard, sucursales, usuarios |
| **5003** | `apps/menu-mf` | Carta, categorías, inventario |
| **5004** | `apps/orders-mf` | Gestión de pedidos |
| **5005** | `apps/kitchen-mf` | Kitchen Display System (KDS) |
| **5006** | `apps/cashier-mf` | Punto de venta (POS) |
| **5007** | `apps/reports-mf` | Reportes y analíticas |
| **5008** | `apps/reservations-mf` | Reservaciones |

---

## 📡 Mapa de Eventos (Event Bus)

| Publicador | Evento | Suscriptores |
|:-----------|:-------|:-------------|
| `auth-mf` | `auth:login` | web-shell, todos los MFEs |
| `auth-mf` | `auth:logout` | web-shell, todos los MFEs |
| `dashboard-mf` | `branch:changed` | orders, kitchen, cashier, reports, reservations |
| `cashier-mf` | `order:created` | orders-mf, kitchen-mf |
| `cashier-mf` | `payment:completed` | reports-mf |
| `kitchen-mf` | `order:status-changed` | orders-mf |
| `orders-mf` | `order:cancelled` | kitchen-mf, reports-mf |
| `menu-mf` | `menu:updated` | cashier-mf, kitchen-mf |
| `reservations-mf` | `reservation:created` | reports-mf |

---

## 🛠️ Stack Tecnológico

### Shell y MFEs

| Tecnología | Versión | Propósito |
|:-----------|--------:|:----------|
| [Next.js](https://nextjs.org/) | 16.2.6 | Shell orquestador (web-shell) |
| [Vite](https://vitejs.dev/) | 6.3 | Bundler para los 8 MFEs |
| [React](https://react.dev/) | 19.2.4 | UI en todos los MFEs |
| [React Router DOM](https://reactrouter.com/) | 7.x | Routing interno de cada MFE |
| [@module-federation/vite](https://module-federation.io/) | 1.x | Module Federation en MFEs Vite |
| [@module-federation/runtime](https://module-federation.io/) | 2.x | Carga dinámica de remotes en el shell |
| [TypeScript](https://www.typescriptlang.org/) | 5 | Tipado estático en todo el monorepo |
| [Tailwind CSS](https://tailwindcss.com/) | 3.4 | Estilos utilitarios compartidos |

### Backend

| Tecnología | Versión | Propósito |
|:-----------|--------:|:----------|
| [NestJS](https://nestjs.com/) | 11 | API REST |
| [TypeScript](https://www.typescriptlang.org/) | 5.7 | Tipado estático |

### Herramientas globales

| Herramienta | Versión | Propósito |
|:------------|--------:|:----------|
| [pnpm](https://pnpm.io/) | ≥ 11.4 | Gestor de paquetes con workspaces |
| [concurrently](https://github.com/open-cli-tools/concurrently) | 9.x | Ejecución paralela de MFEs en dev |
| Node.js | ≥ 18 | Entorno de ejecución |

---

## 📁 Estructura del Proyecto

```
AuraRestMultitenant/
├── apps/
│   ├── backend/              # API REST NestJS (:4000)
│   │
│   ├── web-shell/            # Orquestador Next.js (:3000)
│   │   └── src/
│   │       ├── app/
│   │       │   ├── layout.tsx          # ThemeProvider + fuentes
│   │       │   ├── page.tsx            # Redirecciona según auth
│   │       │   ├── auth/login/         # Carga auth-mf
│   │       │   └── (admin)/            # Protegido por AuthGuard
│   │       │       ├── layout.tsx      # <AuthGuard>
│   │       │       ├── dashboard/      # → dashboard_mf
│   │       │       ├── sucursales/     # → dashboard_mf
│   │       │       ├── orders/         # → orders_mf
│   │       │       ├── kitchen/        # → kitchen_mf
│   │       │       ├── cashier/        # → cashier_mf
│   │       │       ├── menus/          # → menu_mf
│   │       │       ├── categorias/     # → menu_mf
│   │       │       ├── inventario/     # → menu_mf
│   │       │       ├── reportes/       # → reports_mf
│   │       │       ├── analytics/      # → reports_mf
│   │       │       ├── logs/           # → reports_mf
│   │       │       ├── reservaciones/  # → reservations_mf
│   │       │       ├── users/          # → dashboard_mf
│   │       │       ├── tenants/        # → dashboard_mf
│   │       │       └── settings/       # → dashboard_mf
│   │       ├── components/shell/
│   │       │   ├── RemoteLoader.tsx    # Carga dinámica de MFEs
│   │       │   └── AuthGuard.tsx       # Protección de rutas
│   │       └── lib/
│   │           └── federation.ts       # Registra los 8 remotes
│   │
│   ├── auth-mf/              # Autenticación (:5001)
│   ├── dashboard-mf/         # Admin central (:5002)
│   ├── menu-mf/              # Carta e inventario (:5003)
│   ├── orders-mf/            # Pedidos (:5004)
│   ├── kitchen-mf/           # KDS cocina (:5005)
│   ├── cashier-mf/           # POS caja (:5006)
│   ├── reports-mf/           # Reportes y BI (:5007)
│   └── reservations-mf/      # Reservaciones (:5008)
│
├── packages/
│   ├── types/                # @maison/types — todos los tipos de dominio
│   ├── api-client/           # @maison/api-client — cliente HTTP base
│   ├── ui/                   # @maison/ui — design system compartido
│   ├── event-bus/            # @maison/event-bus — comunicación entre MFEs
│   └── auth-client/          # @maison/auth-client — gestión de tokens JWT
│
├── .env.example              # Variables de entorno de referencia
├── package.json              # Scripts globales + concurrently
├── pnpm-workspace.yaml       # Definición de workspaces
└── pnpm-lock.yaml
```

---

## 🚀 Cómo Correr el Proyecto

### Prerrequisitos

```bash
# Node.js >= 18
node --version   # v18.x o superior

# pnpm >= 11.4
npm install -g pnpm
pnpm --version   # 11.x
```

### Instalación

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd AuraRestMultitenant

# 2. Instalar TODAS las dependencias del monorepo de una sola vez
pnpm install
```

> `pnpm install` instala las dependencias de todos los `apps/*` y `packages/*` automáticamente gracias al workspace.

---

### Variables de Entorno

Copia el archivo de ejemplo y ajusta los valores:

```bash
cp .env.example .env.local
```

**.env.example** (referencia completa):

```env
# URL de la API para todos los MFEs (Vite)
VITE_API_URL=http://localhost:4000/api/v1

# URLs de los remoteEntry.js de cada MFE (usados por el web-shell)
NEXT_PUBLIC_MFE_AUTH_URL=http://localhost:5001/remoteEntry.js
NEXT_PUBLIC_MFE_DASHBOARD_URL=http://localhost:5002/remoteEntry.js
NEXT_PUBLIC_MFE_MENU_URL=http://localhost:5003/remoteEntry.js
NEXT_PUBLIC_MFE_ORDERS_URL=http://localhost:5004/remoteEntry.js
NEXT_PUBLIC_MFE_KITCHEN_URL=http://localhost:5005/remoteEntry.js
NEXT_PUBLIC_MFE_CASHIER_URL=http://localhost:5006/remoteEntry.js
NEXT_PUBLIC_MFE_REPORTS_URL=http://localhost:5007/remoteEntry.js
NEXT_PUBLIC_MFE_RESERVATIONS_URL=http://localhost:5008/remoteEntry.js
```

Cada MFE necesita su propio `.env.local` con `VITE_API_URL`. Crea uno en cada app:

```bash
# Ejemplo para dashboard-mf (repetir para cada MFE)
echo "VITE_API_URL=http://localhost:4000/api/v1" > apps/dashboard-mf/.env.local
```

---

### Modo A — Desarrollo con HMR (recomendado al codear)

Levanta los MFEs con Vite HMR y el shell Next.js con hot-reload. Los cambios en código se reflejan instantáneamente.

```bash
# Todo en paralelo (shell + 8 MFEs)
pnpm dev:all
```

Salida esperada (cada proceso en su color de terminal):

```
[shell]   - Local: http://localhost:3030   ← la app completa
[auth]    - Local: http://localhost:5001
[dash]    - Local: http://localhost:5002
[menu]    - Local: http://localhost:5003
[orders]  - Local: http://localhost:5004
[kitchen] - Local: http://localhost:5005
[cashier] - Local: http://localhost:5006
[reports] - Local: http://localhost:5007
[reserv]  - Local: http://localhost:5008
```

**Abre el navegador en** → `http://localhost:3030`

> El shell usa el puerto **3030** (no 3000) porque suele estar ocupado. Si también necesitas cambiar este puerto, edita `apps/web-shell/package.json` → `"dev": "next dev -p XXXX"`.

> **Primer arranque:** Vite compila cada MFE en paralelo (~5-10s). Espera a ver todos los `Local:` antes de abrir el navegador.

---

#### Solo MFEs (shell ya corriendo en otra terminal)

```bash
pnpm dev:mfes     # los 8 MFEs en paralelo, sin el shell
```

---

### Modo B — Preview de build de producción

Primero compila todo, luego sirve los bundles optimizados. Úsalo para verificar el comportamiento real antes de un deploy.

```bash
# Paso 1: compilar todo
pnpm build        # MFEs (Vite) → dist/ + shell (Next.js) → out/

# Paso 2: levantar todo en preview
pnpm preview:all  # shell via npx serve :3030, MFEs via vite preview
```

**Abre el navegador en** → `http://localhost:3030`

> **Importante:** `next start` no funciona con `output: export`. El shell buildado se sirve como HTML estático con `npx serve`. Los MFEs Vite usan `vite preview`.

---

### MFEs individuales

Cuando trabajas en un único dominio:

```bash
# Siempre necesitas el shell levantado
pnpm dev:shell         # → :3030

# Luego solo el MFE que estás desarrollando:
pnpm dev:auth          # → :5001
pnpm dev:dashboard     # → :5002
pnpm dev:menu          # → :5003
pnpm dev:orders        # → :5004
pnpm dev:kitchen       # → :5005
pnpm dev:cashier       # → :5006
pnpm dev:reports       # → :5007
pnpm dev:reservations  # → :5008
```

> Los MFEs que no estén levantados mostrarán un banner de error en el shell ("módulo remoto no disponible"). Es comportamiento esperado: solo importa tener corriendo el MFE que estás editando.

---

### Backend (NestJS)

El backend **no está incluido en el workspace pnpm** todavía. Para levantarlo:

```bash
cd apps/backend
npm install          # usa npm, no pnpm
npm run start:dev    # modo watch en :4000
```

---

### Build de Producción

```bash
# Compila todos los MFEs y luego el shell
pnpm build

# O por separado:
pnpm build:mfes      # Compila los 8 MFEs en orden
pnpm build:shell     # Compila el Next.js shell (requiere MFEs ya compilados)
```

Build de un MFE específico:

```bash
pnpm build:dashboard
pnpm build:auth
pnpm build:menu
pnpm build:orders
pnpm build:kitchen
pnpm build:cashier
pnpm build:reports
pnpm build:reservations
```

> **Nota importante:** El web-shell se construye con `output: 'export'` (HTML estático). Para producción, sirve el directorio `apps/web-shell/out/` con cualquier servidor estático (Nginx, Caddy, etc.) y asegúrate de que cada MFE esté disponible en su URL pública configurada en las variables de entorno.

---

## 📜 Scripts Disponibles

### Desde la raíz del monorepo

**Modo desarrollo (HMR)**

| Script | Descripción | Puerto |
|:-------|:------------|:------:|
| `pnpm dev:all` | Shell + 8 MFEs en paralelo | todos |
| `pnpm dev:mfes` | Solo los 8 MFEs en paralelo | 5001-5008 |
| `pnpm dev:shell` | Solo el web-shell | **3030** |
| `pnpm dev:auth` | Solo auth-mf | 5001 |
| `pnpm dev:dashboard` | Solo dashboard-mf | 5002 |
| `pnpm dev:menu` | Solo menu-mf | 5003 |
| `pnpm dev:orders` | Solo orders-mf | 5004 |
| `pnpm dev:kitchen` | Solo kitchen-mf | 5005 |
| `pnpm dev:cashier` | Solo cashier-mf | 5006 |
| `pnpm dev:reports` | Solo reports-mf | 5007 |
| `pnpm dev:reservations` | Solo reservations-mf | 5008 |

**Build de producción**

| Script | Descripción |
|:-------|:------------|
| `pnpm build` | Build completo: MFEs → `dist/` + shell → `out/` |
| `pnpm build:mfes` | Build secuencial de los 8 MFEs |
| `pnpm build:shell` | Build del Next.js shell (necesita MFEs ya compilados) |
| `pnpm build:<nombre>` | Build de un MFE específico (ej. `build:dashboard`) |

**Preview de producción (requiere build previo)**

| Script | Descripción | Puerto |
|:-------|:------------|:------:|
| `pnpm preview:all` | Shell estático + 8 MFEs en preview | todos |
| `pnpm preview:mfes` | Solo los 8 MFEs en modo preview | 5001-5008 |
| `pnpm preview:shell` | Shell estático via `npx serve` | **3030** |
| `pnpm preview:<nombre>` | Preview de un MFE específico | — |

### Desde la carpeta de cada app

```bash
cd apps/dashboard-mf
pnpm dev        # servidor Vite con HMR
pnpm build      # bundle para producción
pnpm preview    # sirve el build de producción localmente
```

---

## 🧩 Responsabilidades de Cada MFE

| MFE | Puerto | Dominio | Publica eventos | Suscribe a |
|:----|:------:|:--------|:----------------|:-----------|
| `auth-mf` | 5001 | Autenticación, sesión, tokens | `auth:login`, `auth:logout` | — |
| `dashboard-mf` | 5002 | Dashboard, sucursales, usuarios, tenants | `branch:changed` | `auth:login/logout` |
| `menu-mf` | 5003 | Menús, categorías, inventario | `menu:updated` | `branch:changed` |
| `orders-mf` | 5004 | Ciclo de vida de pedidos | `order:cancelled`, `order:updated` | `order:created`, `order:status-changed`, `branch:changed` |
| `kitchen-mf` | 5005 | KDS — cola en tiempo real (WS + polling) | `order:status-changed` | `order:created`, `order:updated`, `branch:changed` |
| `cashier-mf` | 5006 | POS — creación de órdenes, pago | `order:created`, `payment:completed` | `branch:changed`, `menu:updated` |
| `reports-mf` | 5007 | Reportes, analíticas, logs, integraciones | — | `branch:changed`, `payment:completed` |
| `reservations-mf` | 5008 | Reservaciones, calendario, mesas | `reservation:created`, `reservation:cancelled` | `branch:changed` |

---

## 📦 Packages Compartidos

Todos los packages usan `"main": "./src/index.ts"` — se importan directamente desde su TypeScript fuente. Vite y Next.js los transpilan en tiempo de build.

| Package | Propósito |
|:--------|:----------|
| `@maison/types` | Todos los tipos de dominio: `Order`, `Branch`, `MenuItem`, `Reservation`, `KitchenTicket`, `Payment`, etc. |
| `@maison/api-client` | Cliente HTTP base (`apiClient.get/post/put/patch/delete`) con manejo de errores |
| `@maison/ui` | Design system: `StatCard`, `Skeleton*`, `EmptyState`, `Icons`, `cn()` |
| `@maison/event-bus` | `emit()` y `on()` fuertemente tipados via `MaisonEventMap`. SSR-safe. |
| `@maison/auth-client` | `AuthClient.getToken/setToken/clearTokens/isAuthenticated/getUser` — único lugar donde vive el JWT |

---

## 🎨 Sistema de Diseño

### Design Tokens (CSS Variables)

```css
/* Modo oscuro (default) */
.dark {
  --color-bg: 12 11 9;           /* surface-0: fondo profundo */
  --color-surface: 20 18 16;     /* surface-1 */
  --color-accent: 212 151 90;    /* maison-amber */
}
```

### Tipografía

| Estilo | Fuente | Variable CSS | Uso |
|:-------|:-------|:-------------|:----|
| Display | Cormorant (serif) | `--font-display` | Títulos de página |
| Body | Outfit (sans-serif) | `--font-body` | Texto general |
| Mono | JetBrains Mono | `--font-mono` | Números, código, KDS |

### Paleta

| Token | Color | Semántica |
|:------|:------|:----------|
| `maison-cream` | Crema cálido | Texto principal |
| `maison-amber` | Ámbar | Acento, acciones primarias |
| `maison-sage` | Verde salvia | Éxito, estado positivo |
| `maison-ruby` | Rojo rubí | Error, peligro |
| `maison-gold` | Dorado | Advertencia, rating |
| `surface-0/1/2/3` | Grises oscuros | Capas de profundidad |

---

## 🔧 Patrones SOFEA

### Comunicación entre MFEs (Event Bus)

```typescript
// Publicar (ej. en cashier-mf)
import { emit } from '@maison/event-bus';
emit('order:created', { order });

// Suscribirse (ej. en kitchen-mf)
import { on } from '@maison/event-bus';
useEffect(() => {
  const off = on('order:created', ({ order }) => addToQueue(order));
  return off; // cleanup automático
}, []);
```

### Autenticación compartida

```typescript
// Todos los MFEs leen el token desde el mismo lugar
import { AuthClient } from '@maison/auth-client';

const token = AuthClient.getToken();      // string | null
const user  = AuthClient.getUser();       // AuthUser | null
const ok    = AuthClient.isAuthenticated(); // verifica expiración
```

### Servicios REST (por dominio)

```typescript
// Cada MFE tiene sus propios servicios — nunca comparte servicios entre MFEs
import { ordersService } from '../services/orders.service';
const { data } = await ordersService.getAll({ status: 'pending', branchId });
```

### Custom Hooks con estado local

```typescript
// Estado encapsulado por MFE — sin stores globales compartidos
const { tickets, isLoading, updateTicketStatus } = useKitchenQueue();
const { cart, addToCart, submitOrder, processPayment } = usePOS();
```

---

## 🤝 Contribuir

1. Crea una rama: `git checkout -b feature/nombre-del-feature`
2. Sigue la estructura de capas de cada MFE: `types → services → hooks → pages → App.tsx`
3. Importa tipos **siempre** de `@maison/types`, nunca tipos locales entre MFEs
4. Comunicación entre MFEs **solo** via `@maison/event-bus`
5. Verifica TypeScript: `pnpm --filter <nombre-app> exec npx tsc --noEmit`
6. Abre un Pull Request hacia `main`

### Convenciones

- **Nombres de eventos:** `dominio:accion` en minúsculas (ej. `order:created`)
- **Tipos compartidos:** solo en `@maison/types`, con tipado exhaustivo
- **Sin estado global entre MFEs:** cada MFE es una isla de estado
- **Puertos fijos:** no cambiar los puertos del mapa sin actualizar `federation.ts`

---

## 📄 Licencia

Este proyecto está bajo la licencia **ISC**.

---

<div align="center">
  <br />
  <p>
    <sub>Arquitectura SOFEA · Module Federation · pnpm Workspaces</sub>
  </p>
  <br />
</div>
