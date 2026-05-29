'use client';

import { useState, useEffect, useCallback } from 'react';
import { reservationsService } from '@/services/reservations.service';
import type { Reservation, ReservationStats, ReservationFilters } from '@/types/reservation.types';
import type { PaginatedResponse } from '@/types/api.types';

interface UseReservationsReturn {
  stats: ReservationStats | null;
  reservations: PaginatedResponse<Reservation> | null;
  isLoading: boolean;
  error: Error | null;
  filters: ReservationFilters;
  setFilters: (patch: Partial<ReservationFilters>) => void;
  refresh: () => void;
}

export function useReservations(branchId: string): UseReservationsReturn {
  const [stats, setStats] = useState<ReservationStats | null>(null);
  const [reservations, setReservations] = useState<PaginatedResponse<Reservation> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  const [filters, setFiltersState] = useState<ReservationFilters>({ page: 1, limit: 20 });

  const setFilters = useCallback((patch: Partial<ReservationFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...patch, page: 1 }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const branchFilter = branchId !== 'global' ? branchId : undefined;
    const today = new Date().toISOString().split('T')[0];

    Promise.all([
      reservationsService.getStats(branchId, today),
      reservationsService.getAll({ ...filters, branchId: branchFilter }),
    ])
      .then(([statsRes, reservationsRes]) => {
        if (cancelled) return;
        setStats(statsRes.data);
        setReservations(reservationsRes.data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error('Error al cargar reservaciones'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [branchId, filters, tick]);

  return { stats, reservations, isLoading, error, filters, setFilters, refresh: () => setTick((t) => t + 1) };
}
