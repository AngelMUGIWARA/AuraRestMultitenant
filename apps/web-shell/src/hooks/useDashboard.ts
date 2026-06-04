'use client';

import { useState, useEffect } from 'react';
import { dashboardService } from '@/services/dashboard.service';
import type { DashboardStats, ActivityItem } from '@/types/dashboard.types';

interface DashboardData {
  stats: DashboardStats;
  activity: ActivityItem[];
}

interface UseDashboardReturn {
  data: DashboardData | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useDashboard(): UseDashboardReturn {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([
      dashboardService.getStats(),
      dashboardService.getRecentActivity(8),
    ])
      .then(([statsRes, activityRes]) => {
        if (cancelled) return;
        setData({
          stats: statsRes.data,
          activity: activityRes.data,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error('Error al cargar los datos'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tick]);

  return {
    data,
    isLoading,
    error,
    refresh: () => setTick((t) => t + 1),
  };
}
