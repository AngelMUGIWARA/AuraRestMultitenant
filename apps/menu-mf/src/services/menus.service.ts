import { apiClient } from '@maison/api-client';
import type { ApiResponse, PaginatedResponse, MenuItem, MenuStats, MenuFilters, CreateMenuItemPayload, UpdateMenuItemPricePayload } from '@maison/types';

export const menusService = {
  getStats: (branchId?: string) => apiClient.get<ApiResponse<MenuStats>>('/admin/menus/stats', { params: branchId && branchId !== 'global' ? { branchId } : undefined }),
  getAll: (filters?: MenuFilters) => apiClient.get<ApiResponse<PaginatedResponse<MenuItem>>>('/admin/menus', { params: filters as Record<string, string | number | boolean | undefined> }),
  getById: (id: string) => apiClient.get<ApiResponse<MenuItem>>(`/admin/menus/${id}`),
  create: (payload: CreateMenuItemPayload) => apiClient.post<ApiResponse<MenuItem>>('/admin/menus', payload),
  update: (id: string, payload: Partial<CreateMenuItemPayload>) => apiClient.put<ApiResponse<MenuItem>>(`/admin/menus/${id}`, payload),
  updatePrice: (id: string, payload: UpdateMenuItemPricePayload) => apiClient.patch<ApiResponse<MenuItem>>(`/admin/menus/${id}/price`, payload),
  toggleStatus: (id: string, available: boolean) => apiClient.patch<ApiResponse<MenuItem>>(`/admin/menus/${id}/status`, { available }),
  delete: (id: string) => apiClient.delete<ApiResponse<void>>(`/admin/menus/${id}`),
};
