import { useState, useEffect } from 'react';
import { useBranch } from '@maison/ui';
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
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true); setError(null);

    const branchId = selectedBranch.isGlobal ? undefined : selectedBranch.id;

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
  }, [selectedBranch.id, tick]);

  return { data, isLoading, error, refresh: () => setTick((t) => t + 1) };
}
