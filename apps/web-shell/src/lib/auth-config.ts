import { type UserRole, ROLE_ROUTES } from '@maison/types';

/**
 * Matriz de autorización centralizada: qué roles pueden acceder a qué rutas.
 * Se usa en AuthGuard para redirigir/rechazar antes de renderizar contenido.
 * Nota: ADMIN en URLs (/admin/*) corresponde al rol SUPER_ADMIN.
 */
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  // OWNER dashboard (roles: OWNER, SUPER_ADMIN, MANAGER)
  '/dashboard': ['OWNER', 'SUPER_ADMIN'],
  '/reportes': ['OWNER', 'SUPER_ADMIN', 'MANAGER'],
  '/reservaciones': ['OWNER', 'SUPER_ADMIN', 'MANAGER'],
  '/admin/users': ['OWNER', 'SUPER_ADMIN', 'MANAGER'],
  '/sucursales': ['OWNER', 'SUPER_ADMIN', 'MANAGER'],
  '/settings': ['OWNER', 'SUPER_ADMIN'],
  '/inventario': ['OWNER', 'SUPER_ADMIN', 'MANAGER'],

  // MANAGER dashboard (SUPER_ADMIN and MANAGER)
  '/manager-dashboard': ['SUPER_ADMIN', 'MANAGER'],
  '/admin': ['SUPER_ADMIN', 'MANAGER'],
  '/admin/dashboard': ['SUPER_ADMIN', 'MANAGER'],
  '/admin/settings': ['SUPER_ADMIN', 'OWNER', 'MANAGER'],
  '/categorias': ['SUPER_ADMIN', 'MANAGER'],
  '/menus': ['SUPER_ADMIN', 'MANAGER'],
  '/orders': ['SUPER_ADMIN', 'MANAGER'],
  '/analytics': ['SUPER_ADMIN', 'MANAGER'],
  '/integrations': ['SUPER_ADMIN', 'MANAGER'],
  '/logs': ['OWNER', 'SUPER_ADMIN', 'MANAGER'],

  // CASHIER (CASHIER y SUPER_ADMIN)
  '/cashier': ['CASHIER', 'SUPER_ADMIN'],
  '/cashier/dashboard': ['CASHIER', 'SUPER_ADMIN'],
  '/cashier/pos': ['CASHIER', 'SUPER_ADMIN'],
  '/cashier/orders': ['CASHIER', 'SUPER_ADMIN'],
  '/cashier/reservations': ['CASHIER', 'SUPER_ADMIN'],
  '/cashier/settings': ['CASHIER', 'SUPER_ADMIN'],

  // KITCHEN (KITCHEN_STAFF y SUPER_ADMIN)
  '/kitchen': ['KITCHEN_STAFF', 'SUPER_ADMIN'],
  '/chef/dashboard': ['KITCHEN_STAFF', 'SUPER_ADMIN'],
  '/chef/pedidos': ['KITCHEN_STAFF', 'SUPER_ADMIN'],
  '/chef/inventario': ['KITCHEN_STAFF', 'SUPER_ADMIN'],

  // WAITER / Manager
  '/waiter-orders': ['WAITER', 'MANAGER', 'SUPER_ADMIN'],
  '/waiter/tables': ['WAITER', 'MANAGER', 'SUPER_ADMIN'],
  '/waiter/orders': ['WAITER', 'MANAGER', 'SUPER_ADMIN'],
  '/waiter/orders/new': ['WAITER', 'MANAGER', 'SUPER_ADMIN'],
  '/waiter/kitchen': ['WAITER', 'MANAGER', 'SUPER_ADMIN'],
  '/waiter/reservations': ['WAITER', 'MANAGER', 'SUPER_ADMIN'],

  // Rutas públicas (no requieren autenticación)
  '/auth/login': [],
  '/auth/forgot-password': [],
  '/auth/change-password': [],
};

/**
 * Ruta por defecto según el rol.
 * Se usa después de login o cuando se accede a una ruta no permitida.
 */
export const DEFAULT_ROUTE_BY_ROLE: Record<UserRole, string> = ROLE_ROUTES as Record<UserRole, string>;

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

  // 1. Comprobar ruta exacta
  const exactMatch = ROUTE_PERMISSIONS[pathname];
  if (exactMatch) {
    return exactMatch.includes(role as UserRole);
  }

  // 2. Comprobar prefijos — la ruta más específica (más larga) gana.
  //    Esto evita que '/admin' bloquee a OWNER en '/admin/settings'.
  let bestRoles: UserRole[] | null = null;
  let bestLen = 0;
  for (const [path, allowedRoles] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname.startsWith(path + '/') && path.length > bestLen) {
      bestRoles = allowedRoles;
      bestLen = path.length;
    }
  }

  return bestRoles ? bestRoles.includes(role as UserRole) : false;
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