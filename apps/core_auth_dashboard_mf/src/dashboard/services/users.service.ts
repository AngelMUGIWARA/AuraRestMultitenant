import { apiClient } from '@maison/api-client';
import type { ApiResponse, PaginatedResponse, User, UserStats, UserFilters, InviteUserPayload, CreateUserPayload, UpdateUserRolePayload } from '@maison/types';

export const usersService = {
  getStats: () => apiClient.get<ApiResponse<UserStats>>('/admin/users/stats'),
  getAll: (filters?: UserFilters) =>
    apiClient.get<ApiResponse<PaginatedResponse<User>>>('/admin/users', { params: filters as Record<string, string | number | boolean | undefined> }),
  getById: (id: string) => apiClient.get<ApiResponse<User>>(`/admin/users/${id}`),
  create: (payload: CreateUserPayload) => apiClient.post<ApiResponse<User>>('/admin/users', payload),
  invite: (payload: InviteUserPayload) => apiClient.post<ApiResponse<User>>('/admin/users/invite', payload),
  updateRole: (id: string, payload: UpdateUserRolePayload) =>
    apiClient.patch<ApiResponse<User>>(`/admin/users/${id}/role`, payload),
  deactivate: (id: string) => apiClient.patch<ApiResponse<void>>(`/admin/users/${id}/deactivate`, {}),
};
