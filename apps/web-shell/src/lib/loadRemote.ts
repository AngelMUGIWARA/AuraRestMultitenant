'use client';

import { loadRemote, init } from '@module-federation/runtime';
import { MFE_URLS } from './federation';

// Cache para remotos ya cargados
const loadedRemotes = new Set<string>();

/**
 * Carga dinámicamente un remoto (para lazy-loading).
 * Inicializa el remoto si aún no ha sido cargado.
 */
export async function loadRemoteDynamically(
  remoteName: string,
  modulePath: string
): Promise<{ default: any }> {
  // Si el remoto aún no está cargado, inicializalo
  if (!loadedRemotes.has(remoteName)) {
    const mfeUrl = getMFEUrl(remoteName);

    if (!mfeUrl) {
      throw new Error(`No hay URL configurada para el remoto: ${remoteName}`);
    }

    // Registra y inicializa el remoto
    try {
      init({
        name: remoteName,
        remotes: [
          { name: remoteName, entry: mfeUrl, type: 'module' },
        ],
      });

      loadedRemotes.add(remoteName);
    } catch (err) {
      console.error(`Error al inicializar remoto ${remoteName}:`, err);
      throw err;
    }
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
