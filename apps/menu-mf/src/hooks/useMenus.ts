import { useState, useEffect, useCallback } from 'react';
import { menusService } from '../services/menus.service';
import type { MenuItem, MenuItemStatus, MenuStats, MenuFilters, CreateMenuItemPayload, PaginatedResponse } from '@maison/types';

export function useMenus(branchId: string) {
  const [stats, setStats] = useState<MenuStats | null>(null);
  const [items, setItems] = useState<PaginatedResponse<MenuItem> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  const [filters, setFiltersState] = useState<MenuFilters>({ page: 1, limit: 24 });

  const setFilters = useCallback((patch: Partial<MenuFilters>) => setFiltersState((p) => ({ ...p, ...patch, page: 1 })), []);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true); setError(null);
    const branchFilter = branchId !== 'global' ? branchId : undefined;
    Promise.all([menusService.getStats(branchId), menusService.getAll({ ...filters, branchId: branchFilter })])
      .then(([s, i]) => { if (!cancelled) { setStats(s.data); setItems(i.data); } })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e : new Error('Error al cargar')); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [branchId, filters, tick]);

  const createMenuItem = useCallback(async (payload: CreateMenuItemPayload) => {
    setIsMutating(true);
    try {
      await menusService.create(payload);
      refresh();
    } finally {
      setIsMutating(false);
    }
  }, [refresh]);

  const updateMenuItem = useCallback(async (id: string, payload: Partial<CreateMenuItemPayload>) => {
    setIsMutating(true);
    try {
      await menusService.update(id, payload);
      refresh();
    } finally {
      setIsMutating(false);
    }
  }, [refresh]);

  const updateStatus = useCallback(async (id: string, status: MenuItemStatus) => {
    setIsMutating(true);
    try {
      await menusService.updateStatus(id, status);
      refresh();
    } finally {
      setIsMutating(false);
    }
  }, [refresh]);

  const removeMenuItem = useCallback(async (id: string) => {
    setIsMutating(true);
    try {
      await menusService.delete(id);
      refresh();
    } finally {
      setIsMutating(false);
    }
  }, [refresh]);

  return {
    stats,
    items,
    isLoading,
    isMutating,
    error,
    filters,
    setFilters,
    refresh,
    createMenuItem,
    updateMenuItem,
    updateStatus,
    removeMenuItem,
  };
}
