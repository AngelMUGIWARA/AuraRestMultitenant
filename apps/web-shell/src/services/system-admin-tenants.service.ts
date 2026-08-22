import { systemAdminApi } from '@/lib/system-admin-api';
import type {
    CreateTenantPayload,
    CreateTenantResponse,
    SuspendTenantPayload,
    Tenant,
    TenantOwnerCredentials,
    TenantPlanUsage,
    UpdateTenantPayload,
} from '@maison/types';

export const systemAdminTenantsService = {
  getAll: () => systemAdminApi.get<Tenant[]>('/system-admin/tenants'),

  create: (payload: CreateTenantPayload) =>
    systemAdminApi.post<CreateTenantResponse>('/system-admin/tenants', payload),

  update: (id: string, payload: UpdateTenantPayload) =>
    systemAdminApi.put<Tenant>(`/system-admin/tenants/${id}`, payload),

  suspend: (id: string, payload: SuspendTenantPayload) =>
    systemAdminApi.patch<Tenant>(`/system-admin/tenants/${id}/suspend`, payload),

  activate: (id: string) => systemAdminApi.patch<Tenant>(`/system-admin/tenants/${id}/activate`, {}),

  updatePlan: (id: string, plan: Tenant['plan']) =>
    systemAdminApi.patch<Tenant>(`/system-admin/tenants/${id}/plan`, { plan }),

  getPlanUsage: (id: string) =>
    systemAdminApi.get<TenantPlanUsage>(`/system-admin/tenants/${id}/plan-usage`),

  resetOwnerPassword: (id: string) =>
    systemAdminApi.patch<TenantOwnerCredentials>(`/system-admin/tenants/${id}/reset-owner-password`, {}),
};
