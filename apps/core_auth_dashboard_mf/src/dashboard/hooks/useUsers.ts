import { useState, useEffect, useCallback } from 'react';
import { usersService } from '../services/users.service';
import type { User, UserStats, UserFilters, PaginatedResponse } from '@maison/types';

export function useUsers(branchId?: string) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [users, setUsers] = useState<PaginatedResponse<User> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  const [filters, setFiltersState] = useState<UserFilters>({ page: 1, limit: 20 });

  const setFilters = useCallback((patch: Partial<UserFilters>) =>
    setFiltersState((p) => ({ ...p, ...patch, page: 1 })), []);

  const effectiveFilters = { ...filters, branchId: branchId && branchId !== 'global' ? branchId : undefined };

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true); setError(null);
    Promise.all([usersService.getStats(), usersService.getAll(effectiveFilters)])
      .then(([s, u]) => { if (!cancelled) { setStats(s.data); setUsers(u.data); } })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e : new Error('Error al cargar')); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, branchId, tick]);

  return { stats, users, isLoading, error, filters, setFilters, refresh: () => setTick((t) => t + 1) };
}
