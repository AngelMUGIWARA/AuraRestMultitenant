'use client';

import { loadRemote } from '@module-federation/runtime';
import { initFederation } from './federation';

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
 */
export async function loadRemoteDynamically(
  remoteName: string,
  modulePath: string
): Promise<{ default: any }> {
  initFederation();

  const expose = modulePath.startsWith('./') ? modulePath.slice(2) : modulePath;
  const module = await loadRemote<{ default: any }>(`${remoteName}/${expose}`);

  if (!module?.default) {
    throw new Error(`${remoteName}/${modulePath} no exporta un componente default.`);
  }

  return module;
}
