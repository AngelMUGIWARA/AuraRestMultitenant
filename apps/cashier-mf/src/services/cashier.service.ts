import { apiClient } from '@maison/api-client';
import type { ApiResponse, MenuItem, MenuFilters, RestaurantTable, Order, CreateOrderPayload, Payment, ProcessPaymentPayload, PaginatedResponse } from '@maison/types';

export const cashierService = {
  // Menu catalog for POS
  getMenuItems: async (filters?: MenuFilters) => {
    // /admin/menus responde envuelto en { data: { data: MenuItem[], total, ... }, ... }
    const res = await apiClient.get<ApiResponse<PaginatedResponse<MenuItem>>>('/admin/menus', {
      params: { ...(filters as Record<string, string | number | boolean | undefined>), status: 'AVAILABLE' },
    });
    return res.data.data;
  },

  // Tables
  getTables: () =>
    apiClient.get<RestaurantTable[]>('/tables'),

  // Orders
  createOrder: (payload: CreateOrderPayload) =>
    apiClient.post<Order>('/orders', payload),

  // Payments
  processPayment: (payload: ProcessPaymentPayload) =>
    apiClient.post<Payment>('/payments/process', payload),

  // Get payments by order
  getPaymentsByOrder: (orderId: string) =>
    apiClient.get<Payment[]>(`/payments/order/${orderId}`),
};
