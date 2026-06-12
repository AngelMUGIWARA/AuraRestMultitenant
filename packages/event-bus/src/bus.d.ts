import type { MaisonEventName, MaisonEventMap } from './events';
/**
 * Emite un evento en el bus global.
 * @example emit('branch:changed', { branchId: '1', branchName: 'CDMX', isGlobal: false })
 * @example emit('auth:logout', undefined)
 */
export declare function emit<K extends MaisonEventName>(event: K, detail: MaisonEventMap[K]): void;
/**
 * Escucha un evento del bus.
 * @returns Función de cleanup — llámala para cancelar la suscripción.
 * @example
 * const off = on('branch:changed', ({ branchId }) => console.log(branchId));
 * // ...
 * off(); // cancelar
 */
export declare function on<K extends MaisonEventName>(event: K, handler: (detail: MaisonEventMap[K]) => void): () => void;
