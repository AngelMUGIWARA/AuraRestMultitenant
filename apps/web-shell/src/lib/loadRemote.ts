'use client';

import { getMFEUrl, initFederation } from './federation';

import { loadRemote, registerRemotes } from '@module-federation/runtime';

// Cache para remotos ya registrados en la instancia global
const registeredRemotes = new Set<string>();


/**
 * Carga dinámicamente un remoto (para lazy-loading).
 *

 * IMPORTANTE: NO crea una instancia de runtime por remoto. @module-federation/runtime
 * enlaza el `loadRemote` global a la ÚLTIMA instancia creada por `init()`, así que un
 * init() por-remoto robaba el runtime global y hacía fallar las cargas posteriores
 * (#RUNTIME-004, hostName del último remoto lazy). Todos los remotos están registrados
 * en la instancia única `web_shell` (ver initFederation), por lo que basta con
 * asegurar que esa instancia exista y delegar en el `loadRemote` global. El remoteEntry
 * se sigue buscando bajo demanda en el primer uso (lazy).
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
