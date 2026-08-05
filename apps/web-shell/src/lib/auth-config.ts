import type { UserRole } from '@maison/types';

/**
 * Matriz de autorización centralizada: qué roles pueden acceder a qué rutas.
 * Se usa en AuthGuard para redirigir/rechazar antes de renderizar contenido.
 */
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  // OWNER dashboard
  '/dashboard': ['OWNER'],
  '/reportes': ['OWNER', 'ADMIN', 'SUPER_ADMIN'],
  '/reservaciones': ['OWNER', 'ADMIN', 'SUPER_ADMIN'],
  '/sucursales': ['OWNER', 'ADMIN', 'SUPER_ADMIN'],
  '/settings': ['OWNER', 'ADMIN', 'SUPER_ADMIN'],
  '/inventario': ['OWNER', 'ADMIN', 'SUPER_ADMIN'],

  // ADMIN dashboard (accessible by ADMIN and SUPER_ADMIN)
  '/dashboard-admin': ['ADMIN', 'SUPER_ADMIN'],
  '/admin': ['ADMIN', 'SUPER_ADMIN'],
  '/admin/dashboard': ['ADMIN', 'SUPER_ADMIN'],
  '/admin/settings': ['ADMIN', 'SUPER_ADMIN'],
  '/admin/users': ['ADMIN', 'SUPER_ADMIN'],
  '/categorias': ['ADMIN', 'SUPER_ADMIN'],
  '/menus': ['ADMIN', 'SUPER_ADMIN'],
  '/orders': ['ADMIN', 'SUPER_ADMIN'],
  '/analytics': ['ADMIN', 'SUPER_ADMIN'],
  '/integrations': ['ADMIN', 'SUPER_ADMIN'],
  '/logs': ['ADMIN', 'SUPER_ADMIN'],

  // CASHIER
  '/cashier': ['CASHIER', 'OWNER', 'ADMIN', 'SUPER_ADMIN'],

  // KITCHEN
  '/kitchen': ['KITCHEN_STAFF', 'OWNER', 'ADMIN', 'SUPER_ADMIN'],
  '/chef/dashboard': ['KITCHEN_STAFF', 'OWNER', 'ADMIN', 'SUPER_ADMIN'],

  // WAITER / Manager - órdenes
  '/orders': ['WAITER', 'MANAGER', 'OWNER', 'ADMIN', 'SUPER_ADMIN'],
  '/waiter-orders': ['WAITER', 'MANAGER', 'OWNER', 'ADMIN', 'SUPER_ADMIN'],
  '/waiter/tables': ['WAITER', 'MANAGER', 'OWNER', 'ADMIN', 'SUPER_ADMIN'],

  // Rutas públicas (no requieren autenticación)
  '/auth/login': [],
  '/auth/forgot-password': [],
  '/auth/change-password': [],
};

/**
 * Ruta por defecto según el rol.
 * Se usa después de login o cuando se accede a una ruta no permitida.
 */
export const DEFAULT_ROUTE_BY_ROLE: Record<UserRole, string> = {
  OWNER: '/dashboard',
  MANAGER: '/waiter-orders',
  WAITER: '/waiter/tables',
  CASHIER: '/cashier',
  KITCHEN_STAFF: '/chef/dashboard',
  SUPER_ADMIN: '/admin/dashboard',
};

/**
 * Verifica si un usuario con un rol tiene acceso a una ruta.
 * @param pathname - La ruta a verificar (ej. '/dashboard')
 * @param role - El rol del usuario
 * @returns true si el usuario tiene acceso
 */
export function canAccessRoute(pathname: string, role: string | null): boolean {
  if (!role) return false;

  // Rutas públicas (login, etc.)
  if (pathname.startsWith('/auth/')) return true;

  // Buscar en la matriz de permisos
  // Comprobar ruta exacta y prefijos
  for (const [path, allowedRoles] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname === path || pathname.startsWith(path + '/')) {
      return allowedRoles.includes(role as UserRole);
    }
  }

  // Por defecto, negar acceso
  return false;
}

/**
 * Obtiene la ruta a la que redirigir cuando se rechaza acceso a una ruta.
 * @param role - El rol del usuario
 * @returns La ruta por defecto para ese rol
 */
export function getDefaultRouteForRole(role: string | null): string {
  if (!role) return '/auth/login';
  return DEFAULT_ROUTE_BY_ROLE[role as UserRole] ?? '/auth/login';
}
