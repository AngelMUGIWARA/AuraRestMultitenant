import { apiClient } from '@maison/api-client';
import type { ApiResponse, PaginatedResponse, MenuItem, MenuItemStatus, MenuStats, MenuFilters, CreateMenuItemPayload, UpdateMenuItemPricePayload } from '@maison/types';

export const menusService = {
  getStats: (branchId?: string) => apiClient.get<ApiResponse<MenuStats>>('/admin/menus/stats', { params: branchId && branchId !== 'global' ? { branchId } : undefined }),
  getAll: (filters?: MenuFilters) => apiClient.get<ApiResponse<PaginatedResponse<MenuItem>>>('/admin/menus', { params: filters as Record<string, string | number | boolean | undefined> }),
  getById: (id: string) => apiClient.get<ApiResponse<MenuItem>>(`/admin/menus/${id}`),
  create: (payload: CreateMenuItemPayload) => {
    const formData = new FormData();
    formData.append('name', payload.name);
    formData.append('price', payload.price.toString());
    formData.append('categoryId', payload.categoryId);
    if (payload.description) {
      formData.append('description', payload.description);
    }
    if (payload.isAvailable !== undefined) {
      formData.append(
        'isAvailable',
        String(payload.isAvailable),
      );
    }
    if (payload.file) {
      formData.append('file', payload.file);
    }
    return apiClient.post<ApiResponse<MenuItem>>(
      '/admin/menus',
      formData,
    );
  },  
  update: (id: string, payload: Partial<CreateMenuItemPayload>) => {
    const formData = new FormData();

    if (payload.name !== undefined) {
      formData.append('name', payload.name);
    }

    if (payload.description !== undefined) {
      formData.append('description', payload.description);
    }

    if (payload.price !== undefined) {
      formData.append(
        'price',
        payload.price.toString(),
      );
    }

    if (payload.categoryId !== undefined) {
      formData.append(
        'categoryId',
        payload.categoryId,
      );
    }

    if (payload.isAvailable !== undefined) {
      formData.append(
        'isAvailable',
        String(payload.isAvailable),
      );
    }

    if (payload.file) {
      formData.append('file', payload.file);
    }

    return apiClient.put<ApiResponse<MenuItem>>(
      `/admin/menus/${id}`,
      formData,
    );
  },
  updatePrice: (id: string, payload: UpdateMenuItemPricePayload) => apiClient.patch<ApiResponse<MenuItem>>(`/admin/menus/${id}/price`, payload),
  updateStatus: (id: string, status: MenuItemStatus) => apiClient.patch<ApiResponse<MenuItem>>(`/admin/menus/${id}/status`, { status }),
  delete: (id: string) => apiClient.delete<ApiResponse<void>>(`/admin/menus/${id}`),
};
