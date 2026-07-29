import { apiClient } from '@maison/api-client';
import type { ApiResponse, DashboardStats, RevenueDataPoint, ActivityItem } from '@maison/types';

/** Resumen por sucursal para la tabla del dashboard (ver TenantTable). */
export interface BranchSummary {
  id: string;
  name: string;
  ownerEmail: string;
  status: 'active' | 'inactive' | 'suspended' | 'trial';
  plan: 'starter' | 'professional' | 'enterprise';
  monthlyRevenue: number;
  monthlyOrders: number;
  avgRating: number;
}

export const dashboardService = {
  getStats: () => apiClient.get<ApiResponse<DashboardStats>>('/admin/dashboard/stats'),
  getRevenueChart: (period = 'monthly') =>
    apiClient.get<ApiResponse<RevenueDataPoint[]>>('/admin/dashboard/revenue', { params: { period } }),
  getRecentActivity: (limit = 10) =>
    apiClient.get<ApiResponse<ActivityItem[]>>('/admin/dashboard/activity', { params: { limit } }),
  getBranchesSummary: (limit = 5) =>
    apiClient.get<ApiResponse<BranchSummary[]>>('/admin/dashboard/branches-summary', { params: { limit } }),
};
