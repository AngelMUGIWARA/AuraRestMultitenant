'use client';

import { useState, useEffect, useCallback } from 'react';
import { inventoryService } from '@/services/inventory.service';
import type { InventoryItem, InventoryStats, InventoryFilters } from '@/types/inventory.types';
import type { PaginatedResponse } from '@/types/api.types';

interface UseInventoryReturn {
  stats: InventoryStats | null;
  items: PaginatedResponse<InventoryItem> | null;
  isLoading: boolean;
  error: Error | null;
  filters: InventoryFilters;
  setFilters: (patch: Partial<InventoryFilters>) => void;
  refresh: () => void;
}

export function useInventory(branchId: string): UseInventoryReturn {
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [items, setItems] = useState<PaginatedResponse<InventoryItem> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  const [filters, setFiltersState] = useState<InventoryFilters>({ page: 1, limit: 20 });

  const setFilters = useCallback((patch: Partial<InventoryFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...patch, page: 1 }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const branchFilter = branchId !== 'global' ? branchId : undefined;

    Promise.all([
      inventoryService.getStats(branchId),
      inventoryService.getAll({ ...filters, branchId: branchFilter }),
    ])
      .then(([statsRes, itemsRes]) => {
        if (cancelled) return;
        setStats(statsRes.data);
        setItems(itemsRes.data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error('Error al cargar inventario'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [branchId, filters, tick]);

  return {
    stats,
    items,
    isLoading,
    error,
    filters,
    setFilters,
    refresh: () => setTick((t) => t + 1),
  };
}
