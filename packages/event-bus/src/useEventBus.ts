import { useEffect, useRef } from 'react';
import type { MaisonEventName, MaisonEventMap } from './events';
import { on } from './bus';

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
export function useEventBus<K extends MaisonEventName>(
  event: K,
  handler: (detail: MaisonEventMap[K]) => void,
): void {
  // Ref para que siempre invoque el handler actual sin necesitar re-subscribirse
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    return on(event, (detail) => handlerRef.current(detail));
    // `event` es un string literal estable — si el caller lo cambia, debería re-subscribirse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);
}
