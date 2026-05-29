import { apiClient } from './api-client';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';
import type {
  User,
  UserStats,
  UserFilters,
  UpdateUserRolePayload,
  InviteUserPayload,
} from '@/types/user.types';

export const usersService = {
  getStats(branchId?: string): Promise<ApiResponse<UserStats>> {
    return apiClient.get<ApiResponse<UserStats>>('/admin/users/stats', {
      params: branchId && branchId !== 'global' ? { branchId } : undefined,
    });
  },

  getAll(filters: UserFilters = {}): Promise<PaginatedResponse<User>> {
    return apiClient.get<PaginatedResponse<User>>('/admin/users', {
      params: filters as Record<string, string | number | boolean | undefined>,
    });
  },

  getById(id: string): Promise<ApiResponse<User>> {
    return apiClient.get<ApiResponse<User>>(`/admin/users/${id}`);
  },

  invite(payload: InviteUserPayload): Promise<ApiResponse<User>> {
    return apiClient.post<ApiResponse<User>>('/admin/users/invite', payload);
  },

  updateRole(id: string, payload: UpdateUserRolePayload): Promise<ApiResponse<User>> {
    return apiClient.patch<ApiResponse<User>>(`/admin/users/${id}/role`, payload);
  },

  deactivate(id: string): Promise<ApiResponse<User>> {
    return apiClient.patch<ApiResponse<User>>(`/admin/users/${id}/deactivate`, {});
  },

  activate(id: string): Promise<ApiResponse<User>> {
    return apiClient.patch<ApiResponse<User>>(`/admin/users/${id}/activate`, {});
  },
};
