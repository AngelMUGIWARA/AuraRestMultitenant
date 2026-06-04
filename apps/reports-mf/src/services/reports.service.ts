import { apiClient } from '@maison/api-client';
import type { ApiResponse } from '@maison/types';

export const reportsService = {
  getSalesReport: (params: { branchId?: string; startDate?: string; endDate?: string; period?: string }) =>
    apiClient.get<ApiResponse<unknown>>('/admin/reports/sales', { params: params as Record<string, string | undefined> }),
  getAnalytics: (branchId?: string) =>
    apiClient.get<ApiResponse<unknown>>('/admin/analytics', { params: { branchId } }),
  getLogs: (page = 1, limit = 50) =>
    apiClient.get<ApiResponse<unknown>>('/admin/logs', { params: { page, limit } }),
  exportReport: (format: 'csv' | 'pdf', params: Record<string, string>) =>
    apiClient.get<Blob>(`/admin/reports/export`, { params: { format, ...params } }),
};
