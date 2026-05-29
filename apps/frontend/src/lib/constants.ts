export const APP_NAME = 'Maison';
export const APP_VERSION = '1.0.0';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export const ADMIN_NAV = [
  {
    label: 'Visión General',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { href: '/analytics', label: 'Analytics', icon: 'analytics' },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { href: '/tenants', label: 'Tenants', icon: 'tenants' },
      { href: '/users', label: 'Usuarios', icon: 'users' },
      { href: '/menus', label: 'Menús', icon: 'menus' },
      { href: '/orders', label: 'Pedidos', icon: 'orders' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/settings', label: 'Configuración', icon: 'settings' },
      { href: '/integrations', label: 'Integraciones', icon: 'integrations' },
      { href: '/logs', label: 'Registros', icon: 'logs' },
    ],
  },
] as const;

export const TENANT_STATUS_LABELS = {
  active: 'Activo',
  inactive: 'Inactivo',
  suspended: 'Suspendido',
  trial: 'Prueba',
} as const;

export const PLAN_LABELS = {
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
} as const;
