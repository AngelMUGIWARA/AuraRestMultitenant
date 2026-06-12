import { useState, useEffect, useCallback } from 'react';
import { on } from '@maison/event-bus';
import type { Order, OrderStats, OrderFilters, PaginatedResponse } from '@maison/types';
import { ordersService } from '../services/orders.service';

export function useOrders(branchId: string) {
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [orders, setOrders] = useState<PaginatedResponse<Order> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  const [filters, setFiltersState] = useState<OrderFilters>({ page: 1, limit: 30 });

  const setFilters = useCallback(
    (patch: Partial<OrderFilters>) => setFiltersState((p) => ({ ...p, ...patch, page: 1 })),
    [],
  );

  // Main data-fetching effect + event-bus subscriptions
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const branchFilter = branchId !== 'global' ? branchId : undefined;

    Promise.all([
      ordersService.getStats(branchId),
      ordersService.getAll({ ...filters, branchId: branchFilter }),
    ])
      .then(([s, o]) => {
        if (!cancelled) {
          setStats(s.data);
          setOrders(o.data);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error('Error al cargar'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    // Subscribe to event-bus: new order triggers a full refresh
    const offCreated = on('order:created', () => setTick((t) => t + 1));

    // Subscribe to event-bus: status change updates the order in local state
    const offStatusChanged = on('order:status-changed', ({ orderId, status }) => {
      setOrders((prev) =>
        prev
          ? {
              ...prev,
              data: prev.data.map((o) => (o.id === orderId ? { ...o, status } : o)),
            }
          : prev,
      );
    });

    return () => {
      cancelled = true;
      offCreated();
      offStatusChanged();
    };
  }, [branchId, filters, tick]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  return {
    stats,
    orders,
    isLoading,
    error,
    filters,
    setFilters,
    refresh: () => setTick((t) => t + 1),
  };
}
