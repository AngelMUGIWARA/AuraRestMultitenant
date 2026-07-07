import { apiClient } from '@maison/api-client';
import type { ApiResponse, PaginatedResponse, MenuItem, MenuStats, MenuFilters, CreateMenuItemPayload, UpdateMenuItemPricePayload } from '@maison/types';

export const menusService = {
  getStats(branchId?: string): Promise<ApiResponse<MenuStats>> {
    return apiClient.get<ApiResponse<MenuStats>>('/admin/menus/stats', {
      params: branchId && branchId !== 'global' ? { branchId } : undefined,
    });
  },

  getAll(filters?: MenuFilters): Promise<ApiResponse<PaginatedResponse<MenuItem>>> {
    return apiClient.get<ApiResponse<PaginatedResponse<MenuItem>>>('/admin/menus', {
      params: filters as Record<string, string | number | boolean | undefined>,
    });
  },

  getById(id: string): Promise<ApiResponse<MenuItem>> {
    return apiClient.get<ApiResponse<MenuItem>>(`/admin/menus/${id}`);
  },

  create(payload: CreateMenuItemPayload): Promise<ApiResponse<MenuItem>> {
    return apiClient.post<ApiResponse<MenuItem>>('/admin/menus', payload);
  },

  updatePrice(id: string, payload: UpdateMenuItemPricePayload): Promise<ApiResponse<MenuItem>> {
    return apiClient.patch<ApiResponse<MenuItem>>(`/admin/menus/${id}/price`, payload);
  },

  toggleAvailability(id: string): Promise<ApiResponse<MenuItem>> {
    return apiClient.patch<ApiResponse<MenuItem>>(`/admin/menus/${id}/toggle`, {});
  },

  remove(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`/admin/menus/${id}`);
  },
};
