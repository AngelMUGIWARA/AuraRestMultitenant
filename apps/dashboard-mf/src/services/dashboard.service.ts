import { apiClient } from '@maison/api-client';
import type { ApiResponse, DashboardStats, RevenueDataPoint, ActivityItem } from '@maison/types';

export const dashboardService = {
  getStats: () => apiClient.get<ApiResponse<DashboardStats>>('/admin/dashboard/stats'),
  getRevenueChart: (period = 'monthly') =>
    apiClient.get<ApiResponse<RevenueDataPoint[]>>('/admin/dashboard/revenue', { params: { period } }),
  getRecentActivity: (limit = 10) =>
    apiClient.get<ApiResponse<ActivityItem[]>>('/admin/dashboard/activity', { params: { limit } }),
};
