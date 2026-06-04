import { apiClient } from '@maison/api-client';
import type { ApiResponse, PaginatedResponse } from '@maison/types';
import type { Branch, BranchStats, BranchFilters, CreateBranchPayload } from '@/types/branch.types';

export const branchesService = {
  getStats(): Promise<ApiResponse<BranchStats>> {
    return apiClient.get<ApiResponse<BranchStats>>('/admin/branches/stats');
  },

  getAll(filters?: BranchFilters): Promise<ApiResponse<PaginatedResponse<Branch>>> {
    return apiClient.get<ApiResponse<PaginatedResponse<Branch>>>('/admin/branches', {
      params: filters as Record<string, string | number | boolean | undefined>,
    });
  },

  getById(id: string): Promise<ApiResponse<Branch>> {
    return apiClient.get<ApiResponse<Branch>>(`/admin/branches/${id}`);
  },

  create(payload: CreateBranchPayload): Promise<ApiResponse<Branch>> {
    return apiClient.post<ApiResponse<Branch>>('/admin/branches', payload);
  },

  update(id: string, payload: Partial<CreateBranchPayload>): Promise<ApiResponse<Branch>> {
    return apiClient.put<ApiResponse<Branch>>(`/admin/branches/${id}`, payload);
  },

  deactivate(id: string): Promise<ApiResponse<void>> {
    return apiClient.patch<ApiResponse<void>>(`/admin/branches/${id}/deactivate`, {});
  },

  activate(id: string): Promise<ApiResponse<void>> {
    return apiClient.patch<ApiResponse<void>>(`/admin/branches/${id}/activate`, {});
  },
};
