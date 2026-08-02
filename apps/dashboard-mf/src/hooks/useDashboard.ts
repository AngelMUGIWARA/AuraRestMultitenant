import { useState, useEffect } from 'react';
import { dashboardService, type BranchSummary } from '../services/dashboard.service';
import type { DashboardStats, ActivityItem, RevenueDataPoint } from '@maison/types';

interface DashboardData {
  stats: DashboardStats;
  activity: ActivityItem[];
  revenue: RevenueDataPoint[];
  branches: BranchSummary[];
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true); setError(null);
    Promise.all([
      dashboardService.getStats(),
      dashboardService.getRecentActivity(8),
      dashboardService.getRevenueChart(),
      dashboardService.getBranchesSummary(5),
    ])
      .then(([s, a, r, b]) => {
        if (!cancelled) setData({ stats: s.data, activity: a.data, revenue: r.data, branches: b.data });
      })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e : new Error('Error al cargar')); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [tick]);

  return { data, isLoading, error, refresh: () => setTick((t) => t + 1) };
}
