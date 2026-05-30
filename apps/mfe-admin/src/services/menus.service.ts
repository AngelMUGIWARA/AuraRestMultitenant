import { apiClient } from '@maison/api-client';
import type { ApiResponse, PaginatedResponse } from '@maison/types';
import type { MenuItem, MenuStats, MenuFilters, CreateMenuItemPayload, UpdateMenuItemPricePayload } from '../types/menu.types';
export const menusService = {
  getStats: (branchId?: string) => apiClient.get<ApiResponse<MenuStats>>('/admin/menus/stats', { params: branchId && branchId !== 'global' ? { branchId } : undefined }),
  getAll: (filters?: MenuFilters) => apiClient.get<ApiResponse<PaginatedResponse<MenuItem>>>('/admin/menus', { params: filters as Record<string, string | number | boolean | undefined> }),
  getById: (id: string) => apiClient.get<ApiResponse<MenuItem>>(`/admin/menus/${id}`),
  create: (payload: CreateMenuItemPayload) => apiClient.post<ApiResponse<MenuItem>>('/admin/menus', payload),
  updatePrice: (id: string, payload: UpdateMenuItemPricePayload) => apiClient.patch<ApiResponse<MenuItem>>(`/admin/menus/${id}/price`, payload),
  toggleAvailability: (id: string) => apiClient.patch<ApiResponse<MenuItem>>(`/admin/menus/${id}/toggle`, {}),
  remove: (id: string) => apiClient.delete<ApiResponse<void>>(`/admin/menus/${id}`),
};
