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
  getStats: (branchId?: string) => apiClient.get<ApiResponse<DashboardStats>>('/admin/dashboard/stats', { params: { ...(branchId && { branchId }) } }),
  getRevenueChart: (period = 'monthly', branchId?: string) =>
    apiClient.get<ApiResponse<RevenueDataPoint[]>>('/admin/dashboard/revenue', { params: { period, ...(branchId && { branchId }) } }),
  getRecentActivity: (limit = 10, branchId?: string) =>
    apiClient.get<ApiResponse<ActivityItem[]>>('/admin/dashboard/activity', { params: { limit, ...(branchId && { branchId }) } }),
  getBranchesSummary: (limit = 5, branchId?: string) =>
    apiClient.get<ApiResponse<BranchSummary[]>>('/admin/dashboard/branches-summary', { params: { limit, ...(branchId && { branchId }) } }),
};
