import { apiClient } from '@maison/api-client';
import type { ApiResponse, PaginatedResponse, MenuItem, MenuFilters, RestaurantTable, Order, CreateOrderPayload, Payment, ProcessPaymentPayload } from '@maison/types';

export const cashierService = {
  // Menu catalog for POS
  getMenuItems: (filters?: MenuFilters) =>
    apiClient.get<ApiResponse<PaginatedResponse<MenuItem>>>('/admin/menus', {
      params: { ...(filters as Record<string, string | number | boolean | undefined>), status: 'available' },
    }),

  // Tables
  getTables: (branchId?: string) =>
    apiClient.get<ApiResponse<RestaurantTable[]>>('/cashier/tables', { params: { branchId } }),

  // Orders
  createOrder: (payload: CreateOrderPayload) =>
    apiClient.post<ApiResponse<Order>>('/orders', payload),

  // Payments
  processPayment: (payload: ProcessPaymentPayload) =>
    apiClient.post<ApiResponse<Payment>>('/payments', payload),
};
