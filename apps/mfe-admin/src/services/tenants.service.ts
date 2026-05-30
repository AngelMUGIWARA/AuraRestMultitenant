import { apiClient } from '@maison/api-client';
import type { ApiResponse, PaginatedResponse } from '@maison/types';
import type { Tenant, TenantFilters, CreateTenantPayload, SuspendTenantPayload } from '../types/tenant.types';
export const tenantsService = {
  getAll: (filters: TenantFilters = {}) => apiClient.get<PaginatedResponse<Tenant>>('/admin/tenants', { params: filters as Record<string, string | number | boolean | undefined> }),
  getById: (id: string) => apiClient.get<ApiResponse<Tenant>>(`/admin/tenants/${id}`),
  create: (payload: CreateTenantPayload) => apiClient.post<ApiResponse<Tenant>>('/admin/tenants', payload),
  suspend: (id: string, payload: SuspendTenantPayload) => apiClient.patch<ApiResponse<Tenant>>(`/admin/tenants/${id}/suspend`, payload),
  activate: (id: string) => apiClient.patch<ApiResponse<Tenant>>(`/admin/tenants/${id}/activate`, {}),
  remove: (id: string) => apiClient.delete<ApiResponse<void>>(`/admin/tenants/${id}`),
};
