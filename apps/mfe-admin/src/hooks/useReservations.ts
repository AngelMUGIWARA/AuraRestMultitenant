import { useState, useEffect, useCallback } from 'react';
import { reservationsService } from '../services/reservations.service';
import type { Reservation, ReservationStats, ReservationFilters } from '../types/reservation.types';
import type { PaginatedResponse } from '@maison/types';
export function useReservations(branchId: string) {
  const [stats, setStats] = useState<ReservationStats | null>(null);
  const [reservations, setReservations] = useState<PaginatedResponse<Reservation> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  const [filters, setFiltersState] = useState<ReservationFilters>({ page: 1, limit: 20 });
  const setFilters = useCallback((patch: Partial<ReservationFilters>) => setFiltersState((p) => ({ ...p, ...patch, page: 1 })), []);
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true); setError(null);
    const today = new Date().toISOString().split('T')[0];
    Promise.all([reservationsService.getStats(branchId, today), reservationsService.getAll({ ...filters, branchId: branchId !== 'global' ? branchId : undefined })])
      .then(([s, r]) => { if (!cancelled) { setStats(s.data); setReservations(r.data); } })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e : new Error('Error al cargar')); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [branchId, filters, tick]);
  return { stats, reservations, isLoading, error, filters, setFilters, refresh: () => setTick((t) => t + 1) };
}
