import { apiClient } from '@maison/api-client';
import type { ApiResponse, PaginatedResponse } from '@maison/types';
import type { User, UserStats, UserFilters, UpdateUserRolePayload, InviteUserPayload } from '../types/user.types';
export const usersService = {
  getStats: (branchId?: string) => apiClient.get<ApiResponse<UserStats>>('/admin/users/stats', { params: branchId && branchId !== 'global' ? { branchId } : undefined }),
  getAll: (filters: UserFilters = {}) => apiClient.get<PaginatedResponse<User>>('/admin/users', { params: filters as Record<string, string | number | boolean | undefined> }),
  getById: (id: string) => apiClient.get<ApiResponse<User>>(`/admin/users/${id}`),
  invite: (payload: InviteUserPayload) => apiClient.post<ApiResponse<User>>('/admin/users/invite', payload),
  updateRole: (id: string, payload: UpdateUserRolePayload) => apiClient.patch<ApiResponse<User>>(`/admin/users/${id}/role`, payload),
  deactivate: (id: string) => apiClient.patch<ApiResponse<User>>(`/admin/users/${id}/deactivate`, {}),
  activate: (id: string) => apiClient.patch<ApiResponse<User>>(`/admin/users/${id}/activate`, {}),
};
