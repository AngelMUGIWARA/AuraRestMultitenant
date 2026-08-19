import { apiClient } from '@maison/api-client';
import type { ApiResponse, MenuItem, MenuFilters, RestaurantTable, Order, CreateOrderPayload, Payment, ProcessPaymentPayload, PaginatedResponse, Discount } from '@maison/types';

export const cashierService = {
  // Menu catalog for POS
  getMenuItems: async (filters?: MenuFilters) => {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<MenuItem>>>('/admin/menus', {
      params: { ...(filters as Record<string, string | number | boolean | undefined>), status: 'AVAILABLE' },
    });
    return res.data.data;
  },

  // Tables
  getTables: async (branchId?: string) => {
    const res = await apiClient.get<RestaurantTable[]>('/tables', {
      params: branchId ? { branchId } : {},
    });
    return res;
  },

  // Orders
  getOrderById: (orderId: string) =>
    apiClient.get<Order>(`/orders/${orderId}`),

  createOrder: (payload: CreateOrderPayload) =>
    apiClient.post<Order>('/orders', payload),

  // Print ticket
  printTicket: (orderId: string) =>
    apiClient.post<Order>(`/orders/${orderId}/print-ticket`, {}),

  // Discounts
  getAvailableDiscounts: (orderId: string) =>
    apiClient.get<Discount[]>(`/orders/${orderId}/available-discounts`),

  applyDiscount: (orderId: string, discountId: string) =>
    apiClient.patch<Order>(`/orders/${orderId}/discount`, { discountId }),

  removeDiscount: (orderId: string) =>
    apiClient.delete<Order>(`/orders/${orderId}/discount`),

  // Payments
  processPayment: (payload: ProcessPaymentPayload) =>
    apiClient.post<Payment>('/payments/process', payload),

  // Get payments by order
  getPaymentsByOrder: (orderId: string) =>
    apiClient.get<Payment[]>(`/payments/order/${orderId}`),
};
