import type { MaisonEventName, MaisonEventMap } from './events';
/**
 * Hook React para suscribirse a un evento del bus dentro de un componente.
 * Gestiona automáticamente el cleanup al desmontar.
 * Usa useRef para que el handler siempre sea el más reciente sin re-subscribir.
 *
 * @example
 * useEventBus('branch:changed', ({ branchId, isGlobal }) => {
 *   setActiveBranchId(branchId);
 * });
 */
export declare function useEventBus<K extends MaisonEventName>(event: K, handler: (detail: MaisonEventMap[K]) => void): void;
