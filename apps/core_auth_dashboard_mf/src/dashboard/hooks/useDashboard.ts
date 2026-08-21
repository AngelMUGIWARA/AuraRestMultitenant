import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useBranch } from '@maison/ui';
import { useEventBus } from '@maison/event-bus';
import { dashboardService, type BranchSummary } from '../services/dashboard.service';
import type { DashboardStats, ActivityItem, RevenueDataPoint } from '@maison/types';

interface DashboardData {
  stats: DashboardStats;
  activity: ActivityItem[];
  revenue: RevenueDataPoint[];
  branches: BranchSummary[];
}

export function useDashboard() {
  const { selectedBranch } = useBranch();
  const { pathname } = useLocation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true); setError(null);

    const isGlobalDashboard = pathname === '/dashboard';
    const branchId = isGlobalDashboard ? undefined : selectedBranch.isGlobal ? undefined : selectedBranch.id;

    Promise.all([
      dashboardService.getStats(branchId),
      dashboardService.getRecentActivity(8, branchId),
      dashboardService.getRevenueChart('monthly', branchId),
      dashboardService.getBranchesSummary(5, branchId),
    ])
      .then(([s, a, r, b]) => {
        if (!cancelled) setData({ stats: s.data, activity: a.data, revenue: r.data, branches: b.data });
      })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e : new Error('Error al cargar')); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [pathname, selectedBranch.id, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  // A cobro completado en cashier-mf debe reflejarse aquí sin recargar la
  // página. `selectedBranch.id` ya forma parte de las deps del efecto de
  // arriba, así que el refetch dispara con la sucursal actualmente
  // seleccionada — no hace falta que el evento traiga branchId.
  useEventBus('payment:completed', () => refresh());

  return { data, isLoading, error, refresh };
}
