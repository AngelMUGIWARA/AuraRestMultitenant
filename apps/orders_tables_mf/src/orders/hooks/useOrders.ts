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
  const [isActing, setIsActing] = useState(false);

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

    // Reintento único ante fallos transitorios (timeout del api-client,
    // cold-start del pool de la BD) para evitar el "a veces no carga".
    const withRetry = async <T,>(fn: () => Promise<T>, attempt = 0): Promise<T> => {
      try {
        return await fn();
      } catch (e: unknown) {
        if (attempt >= 1 || cancelled) throw e;
        return withRetry(fn, attempt + 1);
      }
    };

    // allSettled: un fallo de stats no debe tumbar el listado de órdenes.
    Promise.allSettled([
      withRetry(() => ordersService.getStats(branchId)),
      withRetry(() => ordersService.getAll({ ...filters, branchId: branchFilter })),
    ]).then(([s, o]) => {
      if (cancelled) return;

      if (s.status === 'fulfilled') setStats(s.value);
      if (o.status === 'fulfilled') setOrders(o.value);

      if (s.status === 'rejected' && o.status === 'rejected') {
        const first = (s.reason ?? o.reason) as unknown;
        setError(first instanceof Error ? first : new Error('Error al cargar'));
      } else {
        setError(null);
      }
    }).catch((e: unknown) => {
      if (!cancelled) setError(e instanceof Error ? e : new Error('Error al cargar'));
    }).finally(() => {
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

  const updateOrderStatus = useCallback(async (orderId: string, status: string) => {
    setIsActing(true);
    setError(null);
    try {
      await ordersService.updateStatus(orderId, { status: status as any, notes: undefined });
      setTick((t) => t + 1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e : new Error('Error al actualizar estado'));
    } finally {
      setIsActing(false);
    }
  }, []);

  const cancelOrder = useCallback(async (orderId: string, reason?: string) => {
    setIsActing(true);
    setError(null);
    try {
      await ordersService.cancel(orderId, reason);
      setTick((t) => t + 1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e : new Error('Error al cancelar orden'));
    } finally {
      setIsActing(false);
    }
  }, []);

  return {
    stats,
    orders,
    isLoading,
    error,
    filters,
    setFilters,
    refresh: () => setTick((t) => t + 1),
    updateOrderStatus,
    cancelOrder,
    isActing,
  };
}
