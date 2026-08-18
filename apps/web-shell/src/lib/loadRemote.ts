'use client';

import { loadRemote, registerRemotes } from '@module-federation/runtime';
import { initFederation, MFE_URLS } from './federation';

// Cache para remotos ya registrados en la instancia global
const registeredRemotes = new Set<string>();

/**
 * Carga dinámicamente un remoto (para lazy-loading).
 *
 * IMPORTANTE: NO crea una instancia de runtime por remoto. @module-federation/runtime
 * enlaza el `loadRemote` global a la ÚLTIMA instancia creada por `init()`, así que un
 * init() por-remoto robaba el runtime global y hacía fallar las cargas posteriores
 * (#RUNTIME-004, hostName del último remoto lazy). NO se debe llamar a `init()` aquí.
 *
 * Los 6 remotos ya están pre-registrados en `initFederation()` (instancia
 * 'web_shell'), así que basta con `loadRemote()`. Para remotos NO pre-registrados
 * se usa `registerRemotes()`, que los añade a la instancia actual SIN reemplazarla.
 */
export async function loadRemoteDynamically(
  remoteName: string,
  modulePath: string
): Promise<{ default: any }> {

  initFederation();

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


  const expose = modulePath.startsWith('./') ? modulePath.slice(2) : modulePath;
  const module = await loadRemote<{ default: any }>(`${remoteName}/${expose}`);

  if (!module?.default) {
    throw new Error(`${remoteName}/${modulePath} no exporta un componente default.`);
  }

  return module;
}

/**
 * Obtiene la URL del remoteEntry de un remoto según su nombre.
 */
function getMFEUrl(remoteName: string): string | null {
  const mfeUrls: Record<string, string> = {
    core_auth_dashboard_mf: MFE_URLS.core_auth_dashboard,
    orders_tables_mf: MFE_URLS.orders_tables,
    reservations_reports_mf: MFE_URLS.reservations_reports,
    kitchen_mf: MFE_URLS.kitchen_mf,
    cashier_mf: MFE_URLS.cashier_mf,
    menu_mf: MFE_URLS.menu_mf,
  };
  return mfeUrls[remoteName] ?? null;
}
