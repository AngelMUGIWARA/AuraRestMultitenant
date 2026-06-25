import { apiClient } from '@maison/api-client';
import type { MenuItem, MenuFilters, RestaurantTable, Order, CreateOrderPayload, Payment, ProcessPaymentPayload, PaginatedResponse } from '@maison/types';

export const cashierService = {
  // Menu catalog for POS
  // TODO: No backend endpoint exists yet (no Menu/Category controller) — replace when menu API is created
  getMenuItems: (filters?: MenuFilters) =>
    apiClient.get<MenuItem[]>('/admin/menus', {
      params: { ...(filters as Record<string, string | number | boolean | undefined>), status: 'available' },
    }),

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
