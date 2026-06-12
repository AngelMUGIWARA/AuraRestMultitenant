'use client';

import { useState, useEffect, useCallback } from 'react';
import { branchesService } from '@/services/branches.service';
import type { Branch, BranchStats, BranchFilters } from '@/types/branch.types';
import type { PaginatedResponse } from '@maison/types';

interface UseBranchesReturn {
  stats: BranchStats | null;
  branches: PaginatedResponse<Branch> | null;
  isLoading: boolean;
  error: Error | null;
  filters: BranchFilters;
  setFilters: (patch: Partial<BranchFilters>) => void;
  refresh: () => void;
}

export function useBranches(): UseBranchesReturn {
  const [stats, setStats] = useState<BranchStats | null>(null);
  const [branches, setBranches] = useState<PaginatedResponse<Branch> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  const [filters, setFiltersState] = useState<BranchFilters>({ page: 1, limit: 20 });

  const setFilters = useCallback((patch: Partial<BranchFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...patch, page: 1 }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([
      branchesService.getStats(),
      branchesService.getAll(filters),
    ])
      .then(([statsRes, branchesRes]) => {
        if (cancelled) return;
        setStats(statsRes.data);
        setBranches(branchesRes.data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error('Error al cargar sucursales'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [filters, tick]);

  return { stats, branches, isLoading, error, filters, setFilters, refresh: () => setTick((t) => t + 1) };
}
