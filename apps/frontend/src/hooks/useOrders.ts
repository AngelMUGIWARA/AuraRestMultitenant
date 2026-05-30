'use client';

import { useState, useEffect, useCallback } from 'react';
import { ordersService } from '@/services/orders.service';
import type { Order, OrderStats, OrderFilters } from '@/types/order.types';
import type { PaginatedResponse } from '@maison/types';

interface UseOrdersReturn {
  stats: OrderStats | null;
  orders: PaginatedResponse<Order> | null;
  isLoading: boolean;
  error: Error | null;
  filters: OrderFilters;
  setFilters: (patch: Partial<OrderFilters>) => void;
  refresh: () => void;
}

export function useOrders(branchId: string): UseOrdersReturn {
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [orders, setOrders] = useState<PaginatedResponse<Order> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  const [filters, setFiltersState] = useState<OrderFilters>({ page: 1, limit: 30 });

  const setFilters = useCallback((patch: Partial<OrderFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...patch, page: 1 }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const branchFilter = branchId !== 'global' ? branchId : undefined;
    const today = new Date().toISOString().split('T')[0];

    Promise.all([
      ordersService.getStats(branchId, today),
      ordersService.getAll({ ...filters, branchId: branchFilter }),
    ])
      .then(([statsRes, ordersRes]) => {
        if (cancelled) return;
        setStats(statsRes.data);
        setOrders(ordersRes.data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error('Error al cargar pedidos'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [branchId, filters, tick]);

  /* Polling each 30s for live updates once API is connected */
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  return { stats, orders, isLoading, error, filters, setFilters, refresh: () => setTick((t) => t + 1) };
}
