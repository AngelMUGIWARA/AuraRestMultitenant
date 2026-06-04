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
[![pnpm](https://img.shields.io/badge/pnpm-11-F69220?style=flat-square&logo=pnpm&logoColor=white)](https://pnpm.io/)
[![License](https://img.shields.io/badge/License-ISC-808080?style=flat-square)]()

</div>

---

## 📋 Tabla de Contenidos

- [Visión General](#-visión-general)
- [Arquitectura](#-arquitectura)
- [Stack Tecnológico](#-stack-tecnológico)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Módulos del Sistema](#-módulos-del-sistema)
- [Primeros Pasos](#-primeros-pasos)
- [Scripts Disponibles](#-scripts-disponibles)
- [Frontend: Componentes y UI](#-frontend-componentes-y-ui)
- [Patrones de Diseño](#-patrones-de-diseño)
- [Estados de Carga y Vacío](#-estados-de-carga-y-vacío)
- [Contribuir](#-contribuir)
- [Licencia](#-licencia)

---

## 🎯 Visión General

**AuraRest Multitenant** es un panel de administración SaaS diseñado para la gestión integral de restaurantes con arquitectura **multitenant**. Permite administrar múltiples restaurantes (tenants) desde una única plataforma, cada uno con sus propias sucursales, menús, inventarios, pedidos y reservaciones.

### ✨ Funcionalidades Clave

| Funcionalidad | Descripción |
|:---|---|
| **Dashboard** | Vista general con métricas clave, gráfico de ingresos y feed de actividad |
| **Multitenant** | Gestión centralizada de múltiples restaurantes con aislamiento de datos |
| **Sucursales** | Administración de sucursales por tenant con métricas individuales |
| **Inventario** | Control de stock con alertas de nivel bajo y crítico |
| **Menús** | Catálogo de productos con precios, disponibilidad y gestión de categorías |
| **Pedidos** | Seguimiento en tiempo real con polling cada 30s y múltiples estados |
| **Reservaciones** | Gestión de reservas con estados: pendiente, confirmada, en mesa, completada |
| **Usuarios** | Roles y permisos: super_admin, admin, manager, staff |
| **Categorías** | Estructura jerárquica de categorías padre e hijo |
| **Tema Oscuro/Claro** | Alternancia suave con persistencia en localStorage |
| **Selector de Sucursal** | Contexto global para filtrar datos por sucursal |

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    AuraRest Multitenant                       │
│                    (Monorepo pnpm)                            │
├────────────────────┬────────────────────────────────────────┤
│                    │                                         │
│   apps/backend     │            apps/frontend                 │
│   (NestJS 11)      │          (Next.js 16 + React 19)        │
│                    │                                         │
│   ┌──────────────┐ │  ┌──────────────────────────────────┐  │
│   │ AppModule    │ │  │  Pages (App Router)              │  │
│   │ AppController│ │  │  ├── Dashboard                   │  │
│   │ AppService   │ │  │  ├── Sucursales                  │  │
│   └──────────────┘ │  │  ├── Inventario                  │  │
│                    │  │  ├── Menús                       │  │
│   API: /api/v1     │  │  ├── Pedidos                     │  │
│   Puerto: 4000     │  │  ├── Reservaciones               │  │
│                    │  │  ├── Usuarios                    │  │
│                    │  │  ├── Categorías                  │  │
│                    │  │  ├── Tenants                     │  │
│                    │  │  ├── Reportes                    │  │
│                    │  │  ├── Settings                    │  │
│                    │  │  └── Integraciones               │  │
│                    │  └──────────────────────────────────┘  │
└────────────────────┴────────────────────────────────────────┘
```

---

## 🛠️ Stack Tecnológico

### Backend (`apps/backend`)

| Tecnología | Versión | Propósito |
|:---|---:|:---|
| [NestJS](https://nestjs.com/) | 11 | Framework backend progresivo |
| [TypeScript](https://www.typescriptlang.org/) | 5.7 | Tipado estático |
| [Jest](https://jestjs.io/) | 30 | Testing unitario y E2E |
| [ESLint](https://eslint.org/) + [Prettier](https://prettier.io/) | — | Linting y formateo |

### Frontend (`apps/frontend`)

| Tecnología | Versión | Propósito |
|:---|---:|:---|
| [Next.js](https://nextjs.org/) | 16.2.6 | Framework React con App Router |
| [React](https://react.dev/) | 19.2.4 | Librería de UI |
| [TypeScript](https://www.typescriptlang.org/) | 5 | Tipado estático |
| [Tailwind CSS](https://tailwindcss.com/) | 3.4 | Estilos utilitarios |
| [React Compiler](https://react.dev/learn/react-compiler) | 1.0 | Optimización de re-renders |

### Herramientas Globales

| Herramienta | Versión | Propósito |
|:---|---:|:---|
| [pnpm](https://pnpm.io/) | ≥11.4 | Gestor de paquetes con workspaces |
| Node.js | — | Entorno de ejecución |

---

## 📁 Estructura del Proyecto

```
aurarest-multitenant/
├── apps/
│   ├── backend/                          # API REST NestJS
│   │   ├── src/
│   │   │   ├── main.ts                   # Punto de entrada
│   │   │   ├── app.module.ts             # Módulo raíz
│   │   │   ├── app.controller.ts         # Controlador raíz
│   │   │   └── app.service.ts            # Servicio raíz
│   │   ├── test/                         # Tests E2E
│   │   ├── eslint.config.mjs             # Config ESLint plana
│   │   ├── nest-cli.json                 # Config NestJS CLI
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── frontend/                         # Panel admin Next.js
│       └── src/
│           ├── app/
│           │   ├── globals.css           # Design tokens + reset
│           │   ├── layout.tsx            # Root layout (3 fuentes)
│           │   ├── page.tsx              # Redirecciona a /dashboard
│           │   └── (admin)/              # Grupo de rutas admin
│           │       ├── layout.tsx        # Admin layout (providers)
│           │       ├── dashboard/        # Panel principal
│           │       ├── analytics/        # Analíticas
│           │       ├── categorias/       # Categorías
│           │       ├── inventario/       # Inventario
│           │       ├── menus/            # Menús
│           │       ├── orders/           # Pedidos
│           │       ├── reportes/         # Reportes
│           │       ├── reservaciones/    # Reservaciones
│           │       ├── settings/         # Configuración
│           │       ├── sucursales/       # Sucursales
│           │       ├── tenants/          # Tenants (multitenant)
│           │       ├── integrations/     # Integraciones
│           │       └── users/            # Usuarios
│           │
│           ├── components/
│           │   ├── admin/
│           │   │   ├── layout/           # AdminShell, Sidebar, Topbar
│           │   │   └── dashboard/        # StatCard, RevenueChart, etc.
│           │   └── ui/                  # Componentes reutilizables
│           │       ├── Icons.tsx         # 40+ iconos SVG inline
│           │       ├── Badge.tsx         # StatusBadge, PlanBadge
│           │       ├── Skeleton.tsx      # Esqueletos de carga
│           │       ├── EmptyState.tsx    # Estado vacío
│           │       ├── BranchSelector.tsx# Selector de sucursal
│           │       └── ThemeToggle.tsx   # Alternancia dark/light
│           │
│           ├── context/                  # Contextos React
│           │   ├── ThemeContext.tsx       # Tema oscuro/claro
│           │   ├── SidebarContext.tsx     # Sidebar colapsable
│           │   └── BranchContext.tsx      # Sucursal seleccionada
│           │
│           ├── hooks/                    # Custom hooks
│           │   ├── useDashboard.ts       # Dashboard + actividad
│           │   ├── useBranches.ts        # Sucursales CRUD
│           │   ├── useCategories.ts      # Categorías
│           │   ├── useInventory.ts       # Inventario
│           │   ├── useMenus.ts           # Menús
│           │   ├── useOrders.ts          # Pedidos (con polling)
│           │   ├── useReservations.ts    # Reservaciones
│           │   └── useUsers.ts           # Usuarios
│           │
│           ├── services/                 # Capa API
│           │   ├── api-client.ts         # Cliente HTTP genérico
│           │   ├── dashboard.service.ts
│           │   ├── branches.service.ts
│           │   ├── categories.service.ts
│           │   ├── inventory.service.ts
│           │   ├── menus.service.ts
│           │   ├── orders.service.ts
│           │   ├── reservations.service.ts
│           │   ├── tenants.service.ts
│           │   └── users.service.ts
│           │
│           ├── types/                    # Tipos TypeScript
│           │   ├── api.types.ts          # ApiResponse, Paginated
│           │   ├── dashboard.types.ts
│           │   ├── branch.types.ts
│           │   ├── category.types.ts
│           │   ├── inventory.types.ts
│           │   ├── menu.types.ts
│           │   ├── order.types.ts
│           │   ├── reservation.types.ts
│           │   ├── tenant.types.ts
│           │   └── user.types.ts
│           │
│           └── lib/
│               ├── constants.ts          # Nav, labels, config
│               └── utils.ts             # cn(), formatCurrency(), etc.
│
├── package.json                          # Root monorepo
├── pnpm-workspace.yaml                   # Config workspaces
├── pnpm-lock.yaml
└── README.md
```

---

## 🧩 Módulos del Sistema

### 🔢 Dashboard
Vista principal con 4 tarjetas KPI (Sucursales, Usuarios, Ingresos, Rating), gráfico de ingresos por período (semana/mes/año), feed de actividad reciente y tabla de sucursales.

### 🏪 Sucursales (Branches)
Gestión de sucursales por tenant. Cada sucursal tiene nombre, ciudad, dirección, teléfono, capacidad, horario y encargado. Estados: activa, inactiva, mantenimiento.

### 📦 Inventario
Control de stock con seguimiento de productos, unidades, costos y estados: normal, bajo, crítico, sin stock. Valoración total del inventario.

### 🍽️ Menús
Catálogo de productos con precios, imágenes, tiempos de preparación, alérgenos y estados (disponible, no disponible, agotado). Soporte para productos populares y destacados.

### 📋 Pedidos (Orders)
Seguimiento completo: pendiente, confirmado, preparando, listo, entregado, cancelado. Tipos: en mesa, para llevar, delivery. Polling automático cada 30s.

### 📅 Reservaciones
Gestión de reservas con código de confirmación, tamaño del grupo, fecha/hora, duración y estados: pendiente, confirmada, en mesa, completada, cancelada, no show.

### 👥 Usuarios
Roles: super_admin, admin, manager, staff. Gestión de invitaciones, estados (activo, inactivo, pendiente) y cambios de rol.

### 🏛️ Tenants
Núcleo multitenant. Planes: Starter, Professional, Enterprise. Estados: activo, inactivo, suspendido, prueba. Estadísticas por tenant.

### 🏷️ Categorías
Estructura jerárquica con categorías padre e hijo, colores y orden personalizado.

---

## 🚀 Primeros Pasos

### Prerrequisitos

- **Node.js** ≥ 18
- **pnpm** ≥ 11.4

```bash
# Instalar pnpm globalmente si no lo tienes
npm install -g pnpm
```

### Instalación

```bash
# Clonar el repositorio
git clone <url-del-repositorio>
cd aurarest-multitenant

# Instalar dependencias (raíz + workspaces)
pnpm install
```

### Ejecutar en Desarrollo

```bash
# Backend (NestJS con watch mode — ejecutar dentro de apps/backend)
cd apps/backend
pnpm start:dev

# Frontend (Next.js con hot reload — ejecutar dentro de apps/frontend)
cd apps/frontend
pnpm dev
```

El frontend estará disponible en `http://localhost:3000`.

### Variables de Entorno

Crea un archivo `.env.local` en `apps/frontend/` para configurar la URL de la API (por defecto apunta a `http://localhost:4000`):

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

> ⚠️ **Nota**: El backend de NestJS escucha en el puerto `3000` por defecto. Para que coincida con la URL que espera el frontend, ejecuta el backend con la variable `PORT=4000`:
>
> ```bash
> cd apps/backend
> PORT=4000 pnpm start:dev
> ```

---

## 📜 Scripts Disponibles

### Backend (`apps/backend`)

| Script | Descripción |
|:---|---:|
| `pnpm start:dev` | Inicia con watch mode |
| `pnpm build` | Compila a `dist/` |
| `pnpm start:prod` | Inicia en producción |
| `pnpm test` | Ejecuta tests unitarios |
| `pnpm test:e2e` | Ejecuta tests E2E |
| `pnpm lint` | Linting con ESLint |
| `pnpm format` | Formateo con Prettier |

### Frontend (`apps/frontend`)

| Script | Descripción |
|:---|---:|
| `pnpm dev` | Inicia servidor de desarrollo |
| `pnpm build` | Build de producción |
| `pnpm start` | Inicia servidor de producción |
| `pnpm lint` | Linting con ESLint |

---

## 🎨 Frontend: Componentes y UI

### Sistema de Diseño

El frontend utiliza un sistema de diseño personalizado con **design tokens** CSS que se adaptan automáticamente al tema claro/oscuro:

```css
:root {
  /* → Modo claro */
  --color-bg: 245 244 241;      /* Fondo cálido */
  --color-surface: 255 255 255; /* Superficie */
  --color-accent: 172 126 64;   /* Acento ámbar */
}

.dark {
  /* → Modo oscuro */
  --color-bg: 12 11 9;          /* Fondo profundo */
  --color-surface: 20 18 16;    /* Superficie oscura */
  --color-accent: 212 151 90;   /* Ámbar más brillante */
}
```

### Tipografía

| Estilo | Fuente | Uso |
|:---|---:|:---|
| Display | **Cormorant** (serif) | Títulos y encabezados |
| Body | **Outfit** (sans-serif) | Texto general |
| Mono | **JetBrains Mono** (mono) | Números y código |

### Paleta de Colores

| Token | Propósito |
|:---|---:|
| `maison-cream` | Texto principal |
| `maison-cream-muted` | Texto secundario |
| `maison-cream-dim` | Texto terciario / muted |
| `maison-amber` | Acento principal |
| `maison-sage` | Éxito / positivo |
| `maison-ruby` | Error / peligro |
| `maison-gold` | Advertencia / destacado |
| `surface-0/1/2/3` | Capas de fondo |

### Componentes UI

| Componente | Descripción |
|:---|---:|
| `AdminShell` | Layout principal con sidebar y topbar |
| `AdminSidebar` | Sidebar colapsable con navegación agrupada |
| `AdminTopbar` | Barra superior con breadcrumbs, búsqueda y acciones |
| `StatCard` | Tarjeta de indicador con icono, valor y tendencia |
| `StatCardSkeleton` | Estado de carga para StatCard |
| `RevenueChartSection` | Gráfico de barras para ingresos |
| `ActivityFeed` | Feed de actividad del sistema |
| `TenantTable` | Tabla de sucursales recientes |
| `Badge` | Estados (activo/inactivo/suspendido) y planes |
| `BranchSelector` | Selector desplegable de sucursal con indicador |
| `EmptyState` | Pantalla de estado vacío con icono y acción |
| `Skeleton` | Componente de carga shimmer |
| `ThemeToggle` | Botón de alternancia dark/light |
| `Icons` | 40+ iconos SVG inline (Lucide-style) |

---

## 🔧 Patrones de Diseño

### Capa de Servicios (API Client)

```typescript
// api-client.ts — Cliente HTTP genérico con tipado
const data = await apiClient.get<ApiResponse<Branch[]>>('/admin/branches');
```

### Custom Hooks (Data Fetching)

Cada módulo tiene su propio hook personalizado que maneja estados de carga, error y refresco:

```typescript
const { data, isLoading, error, refresh } = useDashboard();
const { branches, stats, filters, setFilters } = useBranches();
const { items, stats, isLoading } = useInventory(selectedBranchId);
```

### Contextos Globales

```typescript
// Tema (oscuro/claro)
const { theme, toggleTheme } = useTheme();

// Sidebar (colapsable / drawer móvil)
const { isCollapsed, toggleCollapsed } = useSidebar();

// Sucursal seleccionada (filtro global)
const { selectedBranch, setBranch, isGlobal } = useBranch();
```

### Formateo de Datos

```typescript
formatCurrency(150000)        // "$150,000"
formatNumber(1250)            // "1,250"
formatPercent(12.5)           // "+12.5%"
formatRelativeTime(date)      // "hace 3h" / "hace 2d"
getInitials("Café Roma")      // "CR"
```

### Estados de Carga y Vacío

Todas las vistas implementan tres estados fundamentales:

```
┌─────────────┬────────────────────┬─────────────────────┐
│   Cargando   │       Error        │     Datos Vacíos    │
├─────────────┼────────────────────┼─────────────────────┤
│  Skeleton    │  EmptyState con    │  EmptyState con     │
│  shimmer     │  mensaje de error  │  mensaje informativo│
└─────────────┴────────────────────┴─────────────────────┘
```

---

## 🤝 Contribuir

1. Haz un **Fork** del repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Realiza tus cambios siguiendo la estructura y patrones existentes
4. Ejecuta los tests y asegúrate de que pasen
5. Envía un **Pull Request**

### Convenciones de Código

- **TypeScript** estricto con tipos explícitos
- **Nombres**: camelCase para variables/funciones, PascalCase para componentes
- **Estilos**: Tailwind CSS con clases utilitarias, diseño responsivo mobile-first
- **Componentes**: Preferir componentes server-side de Next.js cuando sea posible
- **Iconos**: Agregar nuevos iconos en `Icons.tsx` usando el helper `base()`

---

## 📄 Licencia

Este proyecto está bajo la licencia **ISC**.

---

<div align="center">
  <br />
  <p>
    <sub>Hecho con ❤️ para la industria restaurantera</sub>
  </p>
  <br />
</div>
