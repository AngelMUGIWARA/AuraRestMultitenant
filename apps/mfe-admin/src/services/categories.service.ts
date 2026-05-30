import { apiClient } from '@maison/api-client';
import type { ApiResponse, PaginatedResponse } from '@maison/types';
import type { Category, CategoryStats, CategoryFilters, CreateCategoryPayload } from '../types/category.types';
export const categoriesService = {
  getStats: (branchId?: string) => apiClient.get<ApiResponse<CategoryStats>>('/admin/categories/stats', { params: branchId && branchId !== 'global' ? { branchId } : undefined }),
  getAll: (filters?: CategoryFilters) => apiClient.get<ApiResponse<PaginatedResponse<Category>>>('/admin/categories', { params: filters as Record<string, string | number | boolean | undefined> }),
  getById: (id: string) => apiClient.get<ApiResponse<Category>>(`/admin/categories/${id}`),
  create: (payload: CreateCategoryPayload) => apiClient.post<ApiResponse<Category>>('/admin/categories', payload),
  update: (id: string, payload: Partial<CreateCategoryPayload>) => apiClient.put<ApiResponse<Category>>(`/admin/categories/${id}`, payload),
  remove: (id: string) => apiClient.delete<ApiResponse<void>>(`/admin/categories/${id}`),
};
