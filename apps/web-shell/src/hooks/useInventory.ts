'use client';

import { useCallback, useEffect, useState } from 'react';
import { inventoryService } from '@/services/inventory.service';
import type {
  InventoryItem,
  InventoryMovement,
  InventoryStockRow,
  MenuAvailability,
  StockAlert,
  Supplier,
} from '@maison/types';

interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

function useAsync<T>(fetcher: () => Promise<T>, deps: unknown[]): AsyncState<T> & { refresh: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ data: null, isLoading: true, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, isLoading: true, error: null }));

    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, isLoading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            data: null,
            isLoading: false,
            error: err instanceof Error ? err : new Error('Error al cargar datos'),
          });
        }
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, refresh };
}

export function useInventoryItems(search?: string) {
  return useAsync<InventoryItem[]>(
    () => inventoryService.getItems({ search: search || undefined }).then((r) => r.data.data),
    [search],
  );
}

export function useInventoryStock(branchId?: string) {
  return useAsync<InventoryStockRow[]>(
    () => inventoryService.getStock(branchId).then((r) => r.data),
    [branchId],
  );
}

export function useStockAlerts(branchId?: string) {
  return useAsync<StockAlert[]>(
    () => inventoryService.getAlerts(branchId).then((r) => r.data),
    [branchId],
  );
}

export function useInventoryMovements(filters?: { branchId?: string; itemId?: string; type?: string }) {
  return useAsync<InventoryMovement[]>(
    () => inventoryService.getMovements(filters).then((r) => r.data),
    [filters?.branchId, filters?.itemId, filters?.type],
  );
}

export function useSuppliers(enabled = true) {
  return useAsync<Supplier[]>(
    () => (enabled ? inventoryService.getSuppliers().then((r) => r.data) : Promise.resolve([])),
    [enabled],
  );
}

export function useMenuAvailability(branchId?: string) {
  return useAsync<MenuAvailability[]>(
    () => inventoryService.getAvailability(branchId).then((r) => r.data),
    [branchId],
  );
}
