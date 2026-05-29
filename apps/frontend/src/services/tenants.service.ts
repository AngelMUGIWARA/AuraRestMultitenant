import { apiClient } from './api-client';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';
import type { Tenant, TenantFilters, CreateTenantPayload, SuspendTenantPayload } from '@/types/tenant.types';

export const tenantsService = {
  getAll(filters: TenantFilters = {}): Promise<PaginatedResponse<Tenant>> {
    return apiClient.get<PaginatedResponse<Tenant>>('/admin/tenants', {
      params: filters as Record<string, string | number | boolean | undefined>,
    });
  },

  getById(id: string): Promise<ApiResponse<Tenant>> {
    return apiClient.get<ApiResponse<Tenant>>(`/admin/tenants/${id}`);
  },

  create(payload: CreateTenantPayload): Promise<ApiResponse<Tenant>> {
    return apiClient.post<ApiResponse<Tenant>>('/admin/tenants', payload);
  },

  suspend(id: string, payload: SuspendTenantPayload): Promise<ApiResponse<Tenant>> {
    return apiClient.patch<ApiResponse<Tenant>>(`/admin/tenants/${id}/suspend`, payload);
  },

  activate(id: string): Promise<ApiResponse<Tenant>> {
    return apiClient.patch<ApiResponse<Tenant>>(`/admin/tenants/${id}/activate`, {});
  },

  remove(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`/admin/tenants/${id}`);
  },
};
