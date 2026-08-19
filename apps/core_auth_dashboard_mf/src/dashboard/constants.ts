export type NavItem = {
  readonly href: string;
  readonly label: string;
  readonly icon: string;
};
export type NavGroup = {
  readonly label: string;
  readonly items: ReadonlyArray<NavItem>;
};
export type NavConfig = ReadonlyArray<NavGroup>;

// Owner navigation — only revenue / branches / settings, no operational sections
export const OWNER_NAV: NavConfig = [
  {
    label: 'General',
    items: [
      { href: '/dashboard',  label: 'Dashboard',     icon: 'dashboard' },
      { href: '/reportes',   label: 'Reportes',      icon: 'analytics' },
      { href: '/reservaciones', label: 'Reservaciones',  icon: 'reservations' },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { href: '/sucursales', label: 'Sucursales',    icon: 'branches' },
      { href: '/admin/settings', label: 'Configuración', icon: 'settings' },
    ],
  },
];

export const BRANCH_STATUS_LABELS = {
  active: 'Activa', inactive: 'Inactiva', maintenance: 'En mantenimiento',
} as const;

export const TENANT_STATUS_LABELS = {
  active: 'Activo', inactive: 'Inactivo', suspended: 'Suspendido', trial: 'Prueba',
} as const;

export const PLAN_LABELS = {
  starter: 'Starter', professional: 'Professional', enterprise: 'Enterprise',
} as const;