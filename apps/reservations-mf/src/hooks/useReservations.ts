import { useState, useEffect, useCallback } from 'react';
import { on } from '@maison/event-bus';
import { reservationsService } from '../services/reservations.service';
import type {
  Reservation,
  ReservationStats,
  ReservationFilters,
  PaginatedResponse,
} from '@maison/types';

export function useReservations(branchId: string) {
  const [stats, setStats] = useState<ReservationStats | null>(null);
  const [reservations, setReservations] = useState<PaginatedResponse<Reservation> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  const [filters, setFiltersState] = useState<ReservationFilters>({
    page: 1,
    limit: 20,
  });

  const setFilters = useCallback(
    (patch: Partial<ReservationFilters>) =>
      setFiltersState((p) => ({ ...p, ...patch, page: 1 })),
    [],
  );

  // 1. Fetching principal + Subscripción al Event Bus en un solo ciclo de vida
  // 1. Fetching principal + Subscripción al Event Bus
useEffect(() => {
  let cancelled = false;
  setIsLoading(true);
  setError(null);

  // Limpiamos el ID si es global tanto para el listado como para las stats
  const branchFilter = branchId !== 'global' && branchId ? branchId : undefined;

  Promise.all([
    // ¡CORREGIDO!: Ahora pasa branchFilter en lugar de branchId crudo
    reservationsService.getStats(branchFilter), 
    reservationsService.getAll({ ...filters, branchId: branchFilter }), 
  ])
    .then(([statsRes, reservationsRes]) => {
      if (!cancelled) {
        // Desempaquetar respuestas de Axios de forma segura
        const statsPayload = (statsRes && 'data' in statsRes) ? (statsRes as any).data : statsRes;
        const reservationsPayload = (reservationsRes && 'data' in reservationsRes) ? (reservationsRes as any).data : reservationsRes;

        const finalStats = statsPayload && typeof statsPayload === 'object' && 'data' in statsPayload
          ? statsPayload.data
          : statsPayload;
        setStats(finalStats);

        setReservations(reservationsPayload as unknown as PaginatedResponse<Reservation>);
      }
    })
    .catch((e: unknown) => {
      if (!cancelled) {
        setError(e instanceof Error ? e : new Error('Error al cargar datos del servidor'));
      }
    })
    .finally(() => {
      if (!cancelled) setIsLoading(false);
    });

  // Escuchar eventos globales del Bus de Eventos
  const offCreated = on('reservation:created', () => setTick((t) => t + 1));
  const offCancelled = on('reservation:cancelled', () => setTick((t) => t + 1));
  
  const offBranch = on('branch:changed', ({ branchId: newBranchId, isGlobal }) => {
     setFilters({ branchId: isGlobal ? undefined : newBranchId });
  });

  return () => {
    cancelled = true;
    offCreated();
    offCancelled();
    offBranch();
  };
}, [branchId, filters, tick]); // Al estar filters aquí, se refrescará correctamente todo bajo demanda

  // 2. Auto-polling: Refrescar de forma pasiva cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  return {
    stats,
    reservations,
    isLoading,
    error,
    filters,
    setFilters,
    refresh: () => setTick((t) => t + 1),
  };
}