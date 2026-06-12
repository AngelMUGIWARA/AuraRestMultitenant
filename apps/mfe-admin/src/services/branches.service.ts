import { apiClient } from '@maison/api-client';
import type { ApiResponse, PaginatedResponse } from '@maison/types';
import type { Branch, BranchStats, BranchFilters, CreateBranchPayload } from '../types/branch.types';
export const branchesService = {
  getStats: () => apiClient.get<ApiResponse<BranchStats>>('/admin/branches/stats'),
  getAll: (filters?: BranchFilters) => apiClient.get<ApiResponse<PaginatedResponse<Branch>>>('/admin/branches', { params: filters as Record<string, string | number | boolean | undefined> }),
  getById: (id: string) => apiClient.get<ApiResponse<Branch>>(`/admin/branches/${id}`),
  create: (payload: CreateBranchPayload) => apiClient.post<ApiResponse<Branch>>('/admin/branches', payload),
  update: (id: string, payload: Partial<CreateBranchPayload>) => apiClient.put<ApiResponse<Branch>>(`/admin/branches/${id}`, payload),
  deactivate: (id: string) => apiClient.patch<ApiResponse<void>>(`/admin/branches/${id}/deactivate`, {}),
  activate: (id: string) => apiClient.patch<ApiResponse<void>>(`/admin/branches/${id}/activate`, {}),
};
