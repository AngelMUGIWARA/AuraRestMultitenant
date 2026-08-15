'use client';

import { loadRemote, registerRemotes } from '@module-federation/runtime';

// Cache para remotos ya registrados en la instancia global
const registeredRemotes = new Set<string>();

/**
 * Carga dinámicamente un remoto (para lazy-loading).
 *
 * IMPORTANTE: NO se debe llamar a `init()` aquí. `init()` crea una NUEVA
 * instancia de FederationInstance (módulo-escopo) y la asigna como la instancia
 * que usan todas las llamadas posteriores a `loadRemote()`. Si se inicializa
 * un remoto con `init({ name: 'menu_mf' })`, TODOS los `loadRemote()` siguientes
 * intentan resolver contra esa instancia (que solo conoce menu_mf) y fallan con
 * RUNTIME-004 "Cannot find remote ... in runtime menu_mf".
 *
 * Los 6 remotos ya están pre-registrados en `initFederation()` (instancia
 * 'web_shell'), así que basta con `loadRemote()`. Para remotos NO pre-registrados
 * se usa `registerRemotes()`, que los añade a la instancia actual SIN reemplazarla.
 */
export async function loadRemoteDynamically(
  remoteName: string,
  modulePath: string
): Promise<{ default: any }> {
  if (!registeredRemotes.has(remoteName)) {
    const mfeUrl = getMFEUrl(remoteName);

    if (!mfeUrl) {
      throw new Error(`No hay URL configurada para el remoto: ${remoteName}`);
    }

    // Añade el remoto a la instancia global actual (web_shell) sin sustituirla.
    registerRemotes([
      { name: remoteName, entry: mfeUrl, type: 'module' },
    ]);

    registeredRemotes.add(remoteName);
  }

  // Carga el módulo del remoto
  const expose = modulePath.startsWith('./') ? modulePath.slice(2) : modulePath;
  const module = await loadRemote<{ default: any }>(`${remoteName}/${expose}`);

  if (!module?.default) {
    throw new Error(`${remoteName}/${modulePath} no exporta un componente default.`);
  }

  return module;
}

/**
 * Obtiene la URL del remoto según su nombre.
 */
function getMFEUrl(remoteName: string): string | null {
  const mfeUrls = {
    core_auth_dashboard_mf: process.env.NEXT_PUBLIC_MFE_CORE_AUTH_DASHBOARD_URL ?? 'http://localhost:5011/remoteEntry.js',
    orders_tables_mf: process.env.NEXT_PUBLIC_MFE_ORDERS_TABLES_URL ?? 'http://localhost:5012/remoteEntry.js',
    reservations_reports_mf: process.env.NEXT_PUBLIC_MFE_RESERVATIONS_REPORTS_URL ?? 'http://localhost:5013/remoteEntry.js',
    kitchen_mf: process.env.NEXT_PUBLIC_MFE_KITCHEN_URL ?? 'http://localhost:5005/remoteEntry.js',
    cashier_mf: process.env.NEXT_PUBLIC_MFE_CASHIER_URL ?? 'http://localhost:5006/remoteEntry.js',
    menu_mf: process.env.NEXT_PUBLIC_MFE_MENU_URL ?? 'http://localhost:5003/remoteEntry.js',
  };

  return (mfeUrls as Record<string, string>)[remoteName] ?? null;
}
