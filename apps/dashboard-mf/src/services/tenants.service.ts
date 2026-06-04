import { apiClient } from '@maison/api-client';
import type { ApiResponse, PaginatedResponse, Tenant, TenantFilters, CreateTenantPayload, SuspendTenantPayload } from '@maison/types';

export const tenantsService = {
  getAll: (filters?: TenantFilters) =>
    apiClient.get<ApiResponse<PaginatedResponse<Tenant>>>('/admin/tenants', { params: filters as Record<string, string | number | boolean | undefined> }),
  getById: (id: string) => apiClient.get<ApiResponse<Tenant>>(`/admin/tenants/${id}`),
  create: (payload: CreateTenantPayload) => apiClient.post<ApiResponse<Tenant>>('/admin/tenants', payload),
  suspend: (id: string, payload: SuspendTenantPayload) =>
    apiClient.patch<ApiResponse<void>>(`/admin/tenants/${id}/suspend`, payload),
  activate: (id: string) => apiClient.patch<ApiResponse<void>>(`/admin/tenants/${id}/activate`, {}),
};
