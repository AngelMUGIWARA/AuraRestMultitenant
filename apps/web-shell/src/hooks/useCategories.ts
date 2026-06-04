'use client';

import { useState, useEffect, useCallback } from 'react';
import { categoriesService } from '@/services/categories.service';
import type { Category, CategoryStats, CategoryFilters } from '@/types/category.types';
import type { PaginatedResponse } from '@maison/types';

interface UseCategoriesReturn {
  stats: CategoryStats | null;
  categories: PaginatedResponse<Category> | null;
  isLoading: boolean;
  error: Error | null;
  filters: CategoryFilters;
  setFilters: (patch: Partial<CategoryFilters>) => void;
  refresh: () => void;
}

export function useCategories(branchId: string): UseCategoriesReturn {
  const [stats, setStats] = useState<CategoryStats | null>(null);
  const [categories, setCategories] = useState<PaginatedResponse<Category> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  const [filters, setFiltersState] = useState<CategoryFilters>({ page: 1, limit: 20 });

  const setFilters = useCallback((patch: Partial<CategoryFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...patch, page: 1 }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const branchFilter = branchId !== 'global' ? branchId : undefined;

    Promise.all([
      categoriesService.getStats(branchId),
      categoriesService.getAll({ ...filters, branchId: branchFilter }),
    ])
      .then(([statsRes, categoriesRes]) => {
        if (cancelled) return;
        setStats(statsRes.data);
        setCategories(categoriesRes.data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error('Error al cargar categorías'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [branchId, filters, tick]);

  return { stats, categories, isLoading, error, filters, setFilters, refresh: () => setTick((t) => t + 1) };
}
