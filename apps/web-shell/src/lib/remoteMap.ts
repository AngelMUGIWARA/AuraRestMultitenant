/**
 * Mapeo de rutas a remotos y módulos.
 * Usado para resolver dinámicamente qué remoto cargar según la ruta actual.
 */

export interface RemoteConfig {
  remote: string;
  module: string;
  lazy?: boolean; // Si es true, el remoto se carga bajo demanda
}

export const remoteMap: Record<string, RemoteConfig> = {
  // Core (auth + dashboard) - cargados al inicio
  '/auth/login': { remote: 'core_auth_dashboard_mf', module: './AuthApp' },
  '/auth/forgot-password': { remote: 'core_auth_dashboard_mf', module: './AuthApp' },
  '/dashboard': { remote: 'core_auth_dashboard_mf', module: './DashboardApp' },
  '/dashboard-admin': { remote: 'core_auth_dashboard_mf', module: './DashboardApp' },

  // Orders + Tables - cargados al inicio
  '/orders': { remote: 'orders_tables_mf', module: './OrdersApp' },
  '/menus': { remote: 'orders_tables_mf', module: './TablesApp' },

  // Reservations + Reports - cargados al inicio
  '/reservaciones': { remote: 'reservations_reports_mf', module: './ReservationsApp' },
  '/reportes': { remote: 'reservations_reports_mf', module: './ReportsApp' },

  // Lazy-loaded (bajo demanda)
  '/kitchen': { remote: 'kitchen_mf', module: './App', lazy: true },
  '/cashier': { remote: 'cashier_mf', module: './App', lazy: true },
  '/waiter-orders': { remote: 'menu_mf', module: './App', lazy: true },
};

/**
 * Obtiene la configuración del remoto para una ruta dada.
 * Busca una coincidencia exacta o por prefijo.
 */
export function getRemoteConfigForRoute(route: string): RemoteConfig | null {
  // Intenta coincidencia exacta primero
  if (remoteMap[route]) {
    return remoteMap[route];
  }

  // Intenta coincidencia por prefijo
  for (const [key, config] of Object.entries(remoteMap)) {
    if (route.startsWith(key)) {
      return config;
    }
  }

  return null;
}

/**
 * Lista de remotos que deben cargarse al iniciar la aplicación.
 */
export const EAGER_REMOTES = [
  'core_auth_dashboard_mf',
  'orders_tables_mf',
  'reservations_reports_mf',
];

/**
 * Lista de remotos que se cargan bajo demanda (lazy).
 */
export const LAZY_REMOTES = [
  'kitchen_mf',
  'cashier_mf',
  'menu_mf',
];
