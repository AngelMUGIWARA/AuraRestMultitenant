export const APP_NAME = 'Maison';
export const APP_VERSION = '1.0.0';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export const ROLE_ROUTES: Record<string, string> = {
  OWNER:         '/dashboard',
  ADMIN:         '/admin',
  MANAGER:       '/waiter-orders',
  WAITER:        '/waiter/tables',
  CASHIER:       '/cashier',
  CHEF:          '/chef/dashboard',
  KITCHEN_STAFF: '/chef/dashboard',
};

export const ADMIN_NAV = [
  {
    label: 'Visión General',
    items: [
      { href: '/dashboard-admin', label: 'Dashboard', icon: 'dashboard' },
      { href: '/reportes', label: 'Reportes', icon: 'analytics' },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { href: '/inventario', label: 'Inventario', icon: 'inventory' },
      { href: '/categorias', label: 'Categorías', icon: 'categories' },
      { href: '/reservaciones', label: 'Reservaciones', icon: 'reservations' },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { href: '/sucursales', label: 'Sucursales', icon: 'branches' },
      { href: '/admin/users', label: 'Usuarios', icon: 'users' },
      { href: '/menus', label: 'Menús', icon: 'menus' },
      { href: '/orders', label: 'Pedidos', icon: 'orders' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/admin/settings', label: 'Configuración', icon: 'settings' },
      { href: '/integrations', label: 'Integraciones', icon: 'integrations' },
      { href: '/logs', label: 'Registros', icon: 'logs' },
    ],
  },
] as const;

export const OWNER_NAV = [
  {
    label: 'Visión General',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { href: '/reportes', label: 'Reportes', icon: 'analytics' },
      { href: '/reservaciones', label: 'Reservaciones', icon: 'reservations' },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { href: '/inventario', label: 'Inventario', icon: 'inventory' },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { href: '/sucursales', label: 'Sucursales', icon: 'branches' },
      { href: '/settings', label: 'Configuración', icon: 'settings' },
    ],
  },
] as const;

export const STOCK_STATUS_LABELS = {
  ok: 'Normal',
  low: 'Bajo',
  critical: 'Crítico',
  out_of_stock: 'Sin Stock',
} as const;

export const RESERVATION_STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  arrived: 'En mesa',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No se presentó',
} as const;

export const SUCURSAL_STATUS_LABELS = {
  active: 'Activa',
  inactive: 'Inactiva',
  suspended: 'Suspendida',
  trial: 'Prueba',
} as const;

//constants admin