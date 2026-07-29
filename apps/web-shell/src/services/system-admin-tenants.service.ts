import { systemAdminApi } from '@/lib/system-admin-api';
import type {
  Tenant,
  CreateTenantPayload,
  CreateTenantResponse,
  SuspendTenantPayload,
  TenantOwnerCredentials,
} from '@maison/types';

export const systemAdminTenantsService = {
  getAll: () => systemAdminApi.get<Tenant[]>('/system-admin/tenants'),

  create: (payload: CreateTenantPayload) =>
    systemAdminApi.post<CreateTenantResponse>('/system-admin/tenants', payload),

  suspend: (id: string, payload: SuspendTenantPayload) =>
    systemAdminApi.patch<Tenant>(`/system-admin/tenants/${id}/suspend`, payload),

  activate: (id: string) => systemAdminApi.patch<Tenant>(`/system-admin/tenants/${id}/activate`, {}),

  resetOwnerPassword: (id: string) =>
    systemAdminApi.patch<TenantOwnerCredentials>(`/system-admin/tenants/${id}/reset-owner-password`, {}),
};
