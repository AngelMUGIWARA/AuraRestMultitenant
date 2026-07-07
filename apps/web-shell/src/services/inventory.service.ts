import { apiClient } from '@maison/api-client';
import type { ApiResponse, PaginatedResponse, InventoryItem, InventoryStats, InventoryFilters } from '@maison/types';

export const inventoryService = {
  getStats(branchId?: string): Promise<ApiResponse<InventoryStats>> {
    return apiClient.get<ApiResponse<InventoryStats>>('/admin/inventory/stats', {
      params: branchId && branchId !== 'global' ? { branchId } : undefined,
    });
  },

  getAll(filters?: InventoryFilters): Promise<ApiResponse<PaginatedResponse<InventoryItem>>> {
    return apiClient.get<ApiResponse<PaginatedResponse<InventoryItem>>>('/admin/inventory', {
      params: filters as Record<string, string | number | boolean | undefined>,
    });
  },

  getById(id: string): Promise<ApiResponse<InventoryItem>> {
    return apiClient.get<ApiResponse<InventoryItem>>(`/admin/inventory/${id}`);
  },

  updateStock(
    id: string,
    payload: { currentStock: number; reason?: string },
  ): Promise<ApiResponse<InventoryItem>> {
    return apiClient.patch<ApiResponse<InventoryItem>>(`/admin/inventory/${id}/stock`, payload);
  },
};
