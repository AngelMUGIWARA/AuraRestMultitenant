import { apiClient } from './api-client';
import type { ApiResponse } from '@/types/api.types';
import type { DashboardStats, RevenueDataPoint, ActivityItem } from '@/types/dashboard.types';

export type RevenuePeriod = 'weekly' | 'monthly' | 'yearly';

export const dashboardService = {
  getStats(): Promise<ApiResponse<DashboardStats>> {
    return apiClient.get<ApiResponse<DashboardStats>>('/admin/dashboard/stats');
  },

  getRevenueChart(period: RevenuePeriod = 'monthly'): Promise<ApiResponse<RevenueDataPoint[]>> {
    return apiClient.get<ApiResponse<RevenueDataPoint[]>>('/admin/dashboard/revenue', {
      params: { period },
    });
  },

  getRecentActivity(limit = 10): Promise<ApiResponse<ActivityItem[]>> {
    return apiClient.get<ApiResponse<ActivityItem[]>>('/admin/dashboard/activity', {
      params: { limit },
    });
  },
};
