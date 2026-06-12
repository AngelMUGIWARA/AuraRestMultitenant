import { useState, useEffect, useCallback } from 'react';
import { categoriesService } from '../services/categories.service';
import type { Category, CategoryStats, CategoryFilters, PaginatedResponse } from '@maison/types';

export function useCategories(branchId: string) {
  const [stats, setStats] = useState<CategoryStats | null>(null);
  const [categories, setCategories] = useState<PaginatedResponse<Category> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  const [filters, setFiltersState] = useState<CategoryFilters>({ page: 1, limit: 20 });

  const setFilters = useCallback((patch: Partial<CategoryFilters>) => setFiltersState((p) => ({ ...p, ...patch, page: 1 })), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true); setError(null);
    const branchFilter = branchId !== 'global' ? branchId : undefined;
    Promise.all([categoriesService.getStats(branchId), categoriesService.getAll({ ...filters, branchId: branchFilter })])
      .then(([s, c]) => { if (!cancelled) { setStats(s.data); setCategories(c.data); } })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e : new Error('Error al cargar')); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [branchId, filters, tick]);

  return { stats, categories, isLoading, error, filters, setFilters, refresh: () => setTick((t) => t + 1) };
}
