import { useState, useEffect, useCallback } from 'react';
import { inventoryService } from '../services/inventory.service';
import type { InventoryItem, InventoryStats, InventoryFilters, PaginatedResponse } from '@maison/types';

export function useInventory(branchId: string) {
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [items, setItems] = useState<PaginatedResponse<InventoryItem> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  const [filters, setFiltersState] = useState<InventoryFilters>({ page: 1, limit: 20 });

  const setFilters = useCallback((patch: Partial<InventoryFilters>) => setFiltersState((p) => ({ ...p, ...patch, page: 1 })), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true); setError(null);
    const branchFilter = branchId !== 'global' ? branchId : undefined;
    Promise.all([inventoryService.getStats(branchId), inventoryService.getAll({ ...filters, branchId: branchFilter })])
      .then(([s, i]) => { if (!cancelled) { setStats(s.data); setItems(i.data); } })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e : new Error('Error al cargar')); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [branchId, filters, tick]);

  return { stats, items, isLoading, error, filters, setFilters, refresh: () => setTick((t) => t + 1) };
}
