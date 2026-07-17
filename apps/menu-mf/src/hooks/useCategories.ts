import { useState, useEffect, useCallback } from 'react';
import { categoriesService } from '../services/categories.service';
import type { Category, CategoryStats, CategoryFilters, CreateCategoryPayload, PaginatedResponse } from '@maison/types';

export function useCategories(branchId: string) {
  const [stats, setStats] = useState<CategoryStats | null>(null);
  const [categories, setCategories] = useState<PaginatedResponse<Category> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  const [filters, setFiltersState] = useState<CategoryFilters>({ page: 1, limit: 20 });

  const setFilters = useCallback((patch: Partial<CategoryFilters>) => setFiltersState((p) => ({ ...p, ...patch, page: 1 })), []);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

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

  const createCategory = useCallback(async (payload: CreateCategoryPayload) => {
    setIsMutating(true);
    try {
      await categoriesService.create(payload);
      refresh();
    } finally {
      setIsMutating(false);
    }
  }, [refresh]);

  const updateCategory = useCallback(async (id: string, payload: Partial<CreateCategoryPayload>) => {
    setIsMutating(true);
    try {
      await categoriesService.update(id, payload);
      refresh();
    } finally {
      setIsMutating(false);
    }
  }, [refresh]);

  const removeCategory = useCallback(async (id: string) => {
    setIsMutating(true);
    try {
      await categoriesService.delete(id);
      refresh();
    } finally {
      setIsMutating(false);
    }
  }, [refresh]);

  return {
    stats,
    categories,
    isLoading,
    isMutating,
    error,
    filters,
    setFilters,
    refresh,
    createCategory,
    updateCategory,
    removeCategory,
  };
}
