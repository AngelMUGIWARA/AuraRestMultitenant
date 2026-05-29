import { apiClient } from './api-client';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';
import type { User, UserFilters, UpdateUserRolePayload } from '@/types/user.types';

export const usersService = {
  getAll(filters: UserFilters = {}): Promise<PaginatedResponse<User>> {
    return apiClient.get<PaginatedResponse<User>>('/admin/users', {
      params: filters as Record<string, string | number | boolean | undefined>,
    });
  },

  getById(id: string): Promise<ApiResponse<User>> {
    return apiClient.get<ApiResponse<User>>(`/admin/users/${id}`);
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
