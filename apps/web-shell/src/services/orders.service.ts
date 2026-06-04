import { apiClient } from '@maison/api-client';
import type { ApiResponse, PaginatedResponse } from '@maison/types';
import type {
  Order,
  OrderStats,
  OrderFilters,
  UpdateOrderStatusPayload,
} from '@/types/order.types';

export const ordersService = {
  getStats(branchId?: string, date?: string): Promise<ApiResponse<OrderStats>> {
    return apiClient.get<ApiResponse<OrderStats>>('/admin/orders/stats', {
      params: {
        ...(branchId && branchId !== 'global' ? { branchId } : {}),
        ...(date ? { date } : {}),
      },
    });
  },

  getAll(filters?: OrderFilters): Promise<ApiResponse<PaginatedResponse<Order>>> {
    return apiClient.get<ApiResponse<PaginatedResponse<Order>>>('/admin/orders', {
      params: filters as Record<string, string | number | boolean | undefined>,
    });
  },

  getById(id: string): Promise<ApiResponse<Order>> {
    return apiClient.get<ApiResponse<Order>>(`/admin/orders/${id}`);
  },

  updateStatus(id: string, payload: UpdateOrderStatusPayload): Promise<ApiResponse<Order>> {
    return apiClient.patch<ApiResponse<Order>>(`/admin/orders/${id}/status`, payload);
  },

  cancel(id: string, reason?: string): Promise<ApiResponse<void>> {
    return apiClient.patch<ApiResponse<void>>(`/admin/orders/${id}/cancel`, { reason });
  },
};
