import { apiClient } from '@maison/api-client';
import type { ApiResponse, PaginatedResponse } from '@maison/types';
import type { Order, OrderStats, OrderFilters, UpdateOrderStatusPayload } from '../types/order.types';
export const ordersService = {
  getStats: (branchId?: string, date?: string) => apiClient.get<ApiResponse<OrderStats>>('/admin/orders/stats', { params: { ...(branchId && branchId !== 'global' ? { branchId } : {}), ...(date ? { date } : {}) } }),
  getAll: (filters?: OrderFilters) => apiClient.get<ApiResponse<PaginatedResponse<Order>>>('/admin/orders', { params: filters as Record<string, string | number | boolean | undefined> }),
  getById: (id: string) => apiClient.get<ApiResponse<Order>>(`/admin/orders/${id}`),
  updateStatus: (id: string, payload: UpdateOrderStatusPayload) => apiClient.patch<ApiResponse<Order>>(`/admin/orders/${id}/status`, payload),
  cancel: (id: string, reason?: string) => apiClient.patch<ApiResponse<void>>(`/admin/orders/${id}/cancel`, { reason }),
};
