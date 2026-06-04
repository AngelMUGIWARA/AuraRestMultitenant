import { apiClient } from '@maison/api-client';
import type { ApiResponse, PaginatedResponse, Category, CategoryStats, CategoryFilters, CreateCategoryPayload } from '@maison/types';

export const categoriesService = {
  getStats: (branchId?: string) => apiClient.get<ApiResponse<CategoryStats>>('/admin/categories/stats', { params: branchId && branchId !== 'global' ? { branchId } : undefined }),
  getAll: (filters?: CategoryFilters) => apiClient.get<ApiResponse<PaginatedResponse<Category>>>('/admin/categories', { params: filters as Record<string, string | number | boolean | undefined> }),
  create: (payload: CreateCategoryPayload) => apiClient.post<ApiResponse<Category>>('/admin/categories', payload),
  update: (id: string, payload: Partial<CreateCategoryPayload>) => apiClient.put<ApiResponse<Category>>(`/admin/categories/${id}`, payload),
  delete: (id: string) => apiClient.delete<ApiResponse<void>>(`/admin/categories/${id}`),
};
