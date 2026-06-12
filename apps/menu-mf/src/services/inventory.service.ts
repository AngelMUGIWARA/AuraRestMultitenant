import { apiClient } from '@maison/api-client';
import type { ApiResponse, PaginatedResponse, InventoryItem, InventoryStats, InventoryFilters } from '@maison/types';

export const inventoryService = {
  getStats: (branchId?: string) => apiClient.get<ApiResponse<InventoryStats>>('/admin/inventory/stats', { params: branchId && branchId !== 'global' ? { branchId } : undefined }),
  getAll: (filters?: InventoryFilters) => apiClient.get<ApiResponse<PaginatedResponse<InventoryItem>>>('/admin/inventory', { params: filters as Record<string, string | number | boolean | undefined> }),
  restock: (id: string, quantity: number) => apiClient.patch<ApiResponse<InventoryItem>>(`/admin/inventory/${id}/restock`, { quantity }),
};
