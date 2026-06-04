import { apiClient } from '@maison/api-client';
import type { ApiResponse, PaginatedResponse } from '@maison/types';
import type { Category, CategoryStats, CategoryFilters, CreateCategoryPayload } from '@/types/category.types';

export const categoriesService = {
  getStats(branchId?: string): Promise<ApiResponse<CategoryStats>> {
    return apiClient.get<ApiResponse<CategoryStats>>('/admin/categories/stats', {
      params: branchId && branchId !== 'global' ? { branchId } : undefined,
    });
  },

  getAll(filters?: CategoryFilters): Promise<ApiResponse<PaginatedResponse<Category>>> {
    return apiClient.get<ApiResponse<PaginatedResponse<Category>>>('/admin/categories', {
      params: filters as Record<string, string | number | boolean | undefined>,
    });
  },

  getById(id: string): Promise<ApiResponse<Category>> {
    return apiClient.get<ApiResponse<Category>>(`/admin/categories/${id}`);
  },

  create(payload: CreateCategoryPayload): Promise<ApiResponse<Category>> {
    return apiClient.post<ApiResponse<Category>>('/admin/categories', payload);
  },

  update(id: string, payload: Partial<CreateCategoryPayload>): Promise<ApiResponse<Category>> {
    return apiClient.put<ApiResponse<Category>>(`/admin/categories/${id}`, payload);
  },

  remove(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`/admin/categories/${id}`);
  },
};
