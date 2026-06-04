// Navigation structure used by AdminSidebar and AdminTopbar breadcrumbs.
// This nav reflects the FULL multi-MFE app — links point to the shell router.
export const ADMIN_NAV = [
  {
    label: 'Visión General',
    items: [
      { href: '/dashboard',     label: 'Dashboard',     icon: 'dashboard' },
      { href: '/reportes',      label: 'Reportes',      icon: 'analytics' },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { href: '/orders',        label: 'Pedidos',        icon: 'orders' },
      { href: '/kitchen',       label: 'Cocina',         icon: 'kitchen' },
      { href: '/cashier',       label: 'Caja / POS',     icon: 'cashier' },
      { href: '/reservaciones', label: 'Reservaciones',  icon: 'reservations' },
    ],
  },
  {
    label: 'Carta',
    items: [
      { href: '/menus',         label: 'Menús',          icon: 'menus' },
      { href: '/categorias',    label: 'Categorías',     icon: 'categories' },
      { href: '/inventario',    label: 'Inventario',     icon: 'inventory' },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { href: '/sucursales',    label: 'Sucursales',     icon: 'branches' },
      { href: '/users',         label: 'Usuarios',       icon: 'users' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/settings',      label: 'Configuración',  icon: 'settings' },
      { href: '/integrations',  label: 'Integraciones',  icon: 'integrations' },
      { href: '/logs',          label: 'Registros',      icon: 'logs' },
    ],
  },
] as const;

export const BRANCH_STATUS_LABELS = {
  active: 'Activa', inactive: 'Inactiva', maintenance: 'En mantenimiento',
} as const;

export const TENANT_STATUS_LABELS = {
  active: 'Activo', inactive: 'Inactivo', suspended: 'Suspendido', trial: 'Prueba',
} as const;

export const PLAN_LABELS = {
  starter: 'Starter', professional: 'Professional', enterprise: 'Enterprise',
} as const;
