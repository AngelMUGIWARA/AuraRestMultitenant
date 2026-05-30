import type { MaisonEventName, MaisonEventMap } from './events';

const NS = 'maison:';

// Guard para entornos no-browser (build estático de Next.js, tests en Node, etc.)
const getWindow = (): Window & typeof globalThis | null =>
  typeof window !== 'undefined' ? window : null;

/**
 * Emite un evento en el bus global.
 * @example emit('branch:changed', { branchId: '1', branchName: 'CDMX', isGlobal: false })
 * @example emit('auth:logout', undefined)
 */
export function emit<K extends MaisonEventName>(event: K, detail: MaisonEventMap[K]): void {
  getWindow()?.dispatchEvent(
    new CustomEvent(`${NS}${event}`, { detail, bubbles: false }),
  );
}

/**
 * Escucha un evento del bus.
 * @returns Función de cleanup — llámala para cancelar la suscripción.
 * @example
 * const off = on('branch:changed', ({ branchId }) => console.log(branchId));
 * // ...
 * off(); // cancelar
 */
export function on<K extends MaisonEventName>(
  event: K,
  handler: (detail: MaisonEventMap[K]) => void,
): () => void {
  const win = getWindow();
  if (!win) return () => {};

  const listener = (e: Event) =>
    handler((e as CustomEvent<MaisonEventMap[K]>).detail);

  win.addEventListener(`${NS}${event}`, listener);
  return () => win.removeEventListener(`${NS}${event}`, listener);
}
