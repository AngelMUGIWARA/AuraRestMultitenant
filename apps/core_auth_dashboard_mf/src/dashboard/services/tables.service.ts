import { apiClient } from '@maison/api-client';
import type { ApiResponse, RestaurantTable } from '@maison/types';

interface CreateTablePayload {
  number: number;
  capacity: number;
}

interface UpdateTablePayload {
  capacity?: number;
}

export const tablesService = {
  getByBranch: (branchId: string) =>
    apiClient.get<ApiResponse<RestaurantTable[]>>(`/admin/branches/${branchId}/tables`),

  create: (branchId: string, payload: CreateTablePayload) =>
    apiClient.post<ApiResponse<RestaurantTable>>(`/admin/branches/${branchId}/tables`, payload),

  update: (branchId: string, tableId: string, payload: UpdateTablePayload) =>
    apiClient.patch<ApiResponse<RestaurantTable>>(`/admin/branches/${branchId}/tables/${tableId}`, payload),

  delete: (branchId: string, tableId: string) =>
    apiClient.delete<ApiResponse<void>>(`/admin/branches/${branchId}/tables/${tableId}`),
};
