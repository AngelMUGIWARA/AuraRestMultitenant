import { apiClient } from '@maison/api-client';
import type { PaginatedResponse, Order, OrderStats, OrderFilters, UpdateOrderStatusPayload, CreateOrderPayload, MenuItem, RestaurantTable } from '@maison/types';

export const ordersService = {
  getStats: (branchId?: string) =>
    apiClient.get<OrderStats>('/orders/stats', {
      params: { ...(branchId && branchId !== 'global' ? { branchId } : {}), date: new Date().toISOString().split('T')[0] },
    }),
  getAll: (filters?: OrderFilters) =>
    apiClient.get<PaginatedResponse<Order>>('/orders', {
      params: filters as Record<string, string | number | boolean | undefined>,
    }),
  getById: (id: string) =>
    apiClient.get<Order>(`/orders/${id}`),
  updateStatus: (id: string, payload: UpdateOrderStatusPayload) =>
    apiClient.patch<Order>(`/orders/${id}/status`, payload),
  cancel: (id: string, reason?: string) =>
    apiClient.post<Order>(`/orders/${id}/cancel`, { reason }),
  createOrder: (payload: CreateOrderPayload) =>
    apiClient.post<Order>('/orders', payload),
  getMenuItems: (categoryId?: string) =>
    apiClient.get<MenuItem[]>('/admin/menus', {
      params: { ...(categoryId ? { categoryId } : {}), status: 'AVAILABLE' },
    }),
  getTable: (id: string) =>
    apiClient.get<RestaurantTable>(`/tables/${id}`),
};
