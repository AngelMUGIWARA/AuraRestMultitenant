import { useState, useEffect, useCallback } from 'react';
import { branchesService } from '../services/branches.service';
import type { Branch, BranchStats, BranchFilters } from '../types/branch.types';
import type { PaginatedResponse } from '@maison/types';
export function useBranches() {
  const [stats, setStats] = useState<BranchStats | null>(null);
  const [branches, setBranches] = useState<PaginatedResponse<Branch> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  const [filters, setFiltersState] = useState<BranchFilters>({ page: 1, limit: 20 });
  const setFilters = useCallback((patch: Partial<BranchFilters>) => setFiltersState((p) => ({ ...p, ...patch, page: 1 })), []);
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true); setError(null);
    Promise.all([branchesService.getStats(), branchesService.getAll(filters)])
      .then(([s, b]) => { if (!cancelled) { setStats(s.data); setBranches(b.data); } })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e : new Error('Error al cargar')); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [filters, tick]);
  return { stats, branches, isLoading, error, filters, setFilters, refresh: () => setTick((t) => t + 1) };
}
