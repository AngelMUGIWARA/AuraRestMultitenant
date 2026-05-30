'use client';

import { useState, useEffect, useCallback } from 'react';
import { usersService } from '@/services/users.service';
import type { User, UserStats, UserFilters } from '@/types/user.types';
import type { PaginatedResponse } from '@maison/types';

interface UseUsersReturn {
  stats: UserStats | null;
  users: PaginatedResponse<User> | null;
  isLoading: boolean;
  error: Error | null;
  filters: UserFilters;
  setFilters: (patch: Partial<UserFilters>) => void;
  refresh: () => void;
}

export function useUsers(branchId: string): UseUsersReturn {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [users, setUsers] = useState<PaginatedResponse<User> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  const [filters, setFiltersState] = useState<UserFilters>({ page: 1, limit: 20 });

  const setFilters = useCallback((patch: Partial<UserFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...patch, page: 1 }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const branchFilter = branchId !== 'global' ? branchId : undefined;

    Promise.all([
      usersService.getStats(branchId),
      usersService.getAll({ ...filters, branchId: branchFilter }),
    ])
      .then(([statsRes, usersRes]) => {
        if (cancelled) return;
        setStats(statsRes.data);
        // usersService.getAll returns PaginatedResponse<User> directly
        setUsers(usersRes);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error('Error al cargar usuarios'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [branchId, filters, tick]);

  return { stats, users, isLoading, error, filters, setFilters, refresh: () => setTick((t) => t + 1) };
}
