import { useState, useEffect, useCallback } from 'react';
import { ordersService } from '../services/orders.service';
import type { Order, OrderStats, OrderFilters } from '../types/order.types';
import type { PaginatedResponse } from '@maison/types';
export function useOrders(branchId: string) {
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [orders, setOrders] = useState<PaginatedResponse<Order> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  const [filters, setFiltersState] = useState<OrderFilters>({ page: 1, limit: 30 });
  const setFilters = useCallback((patch: Partial<OrderFilters>) => setFiltersState((p) => ({ ...p, ...patch, page: 1 })), []);
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true); setError(null);
    const branchFilter = branchId !== 'global' ? branchId : undefined;
    const today = new Date().toISOString().split('T')[0];
    Promise.all([ordersService.getStats(branchId, today), ordersService.getAll({ ...filters, branchId: branchFilter })])
      .then(([s, o]) => { if (!cancelled) { setStats(s.data); setOrders(o.data); } })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e : new Error('Error al cargar')); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [branchId, filters, tick]);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);
  return { stats, orders, isLoading, error, filters, setFilters, refresh: () => setTick((t) => t + 1) };
}
