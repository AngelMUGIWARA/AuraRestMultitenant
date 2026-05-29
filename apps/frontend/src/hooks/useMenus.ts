'use client';

import { useState, useEffect, useCallback } from 'react';
import { menusService } from '@/services/menus.service';
import type { MenuItem, MenuStats, MenuFilters } from '@/types/menu.types';
import type { PaginatedResponse } from '@/types/api.types';

interface UseMenusReturn {
  stats: MenuStats | null;
  items: PaginatedResponse<MenuItem> | null;
  isLoading: boolean;
  error: Error | null;
  filters: MenuFilters;
  setFilters: (patch: Partial<MenuFilters>) => void;
  refresh: () => void;
}

export function useMenus(branchId: string): UseMenusReturn {
  const [stats, setStats] = useState<MenuStats | null>(null);
  const [items, setItems] = useState<PaginatedResponse<MenuItem> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  const [filters, setFiltersState] = useState<MenuFilters>({ page: 1, limit: 24 });

  const setFilters = useCallback((patch: Partial<MenuFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...patch, page: 1 }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const branchFilter = branchId !== 'global' ? branchId : undefined;

    Promise.all([
      menusService.getStats(branchId),
      menusService.getAll({ ...filters, branchId: branchFilter }),
    ])
      .then(([statsRes, itemsRes]) => {
        if (cancelled) return;
        setStats(statsRes.data);
        setItems(itemsRes.data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error('Error al cargar el menú'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [branchId, filters, tick]);

  return { stats, items, isLoading, error, filters, setFilters, refresh: () => setTick((t) => t + 1) };
}
