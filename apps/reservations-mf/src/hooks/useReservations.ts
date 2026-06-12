import { useState, useEffect, useCallback } from 'react';
import { on } from '@maison/event-bus';
import { reservationsService } from '../services/reservations.service';
import type {
  Reservation,
  ReservationStats,
  ReservationFilters,
  PaginatedResponse,
} from '@maison/types';

export function useReservations(initialBranchId: string) {
  const [stats, setStats] = useState<ReservationStats | null>(null);
  const [reservations, setReservations] = useState<PaginatedResponse<Reservation> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  const [filters, setFiltersState] = useState<ReservationFilters>({
    page: 1,
    limit: 20,
    branchId: initialBranchId !== 'global' ? initialBranchId : undefined,
  });

  const setFilters = useCallback(
    (patch: Partial<ReservationFilters>) =>
      setFiltersState((p) => ({ ...p, ...patch, page: 1 })),
    [],
  );

  // Subscribe to branch changes and re-filter accordingly
  useEffect(() => {
    const off = on('branch:changed', ({ branchId, isGlobal }) => {
      setFilters({ branchId: isGlobal ? undefined : branchId });
    });
    return off;
  }, [setFilters]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([
      reservationsService.getStats(filters.branchId),
      reservationsService.getAll(filters),
    ])
      .then(([s, r]) => {
        if (!cancelled) {
          setStats(s.data);
          setReservations(r.data);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error('Error al cargar'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters, tick]);

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
