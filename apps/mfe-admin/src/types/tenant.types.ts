export type TenantStatus = 'active' | 'inactive' | 'suspended' | 'trial';
export type TenantPlan = 'starter' | 'professional' | 'enterprise';
export interface Tenant {
  id: string; name: string; slug: string; status: TenantStatus; plan: TenantPlan;
  logoUrl?: string; ownerId: string; ownerEmail: string; restaurantCount: number;
  activeMenus: number; monthlyRevenue: number; monthlyOrders: number;
  avgRating: number; createdAt: string; updatedAt: string;
}
export interface TenantFilters {
  status?: TenantStatus; plan?: TenantPlan; search?: string;
  page?: number; limit?: number; sortBy?: 'createdAt'|'name'|'monthlyRevenue'; sortOrder?: 'asc'|'desc';
}
export interface CreateTenantPayload { name: string; slug: string; plan: TenantPlan; ownerEmail: string; ownerName: string; }
export interface SuspendTenantPayload { reason: string; notifyOwner?: boolean; }
