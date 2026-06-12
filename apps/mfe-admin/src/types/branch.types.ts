export type BranchStatus = 'active' | 'inactive' | 'maintenance';
export interface Branch {
  id: string; name: string; slug?: string; city: string; address?: string;
  phone?: string; email?: string; status?: BranchStatus; isGlobal?: boolean;
  isActive?: boolean; openingHours?: string; capacity?: number;
  managerName?: string; tenantId?: string; avgRating?: number;
  ordersToday?: number; createdAt?: string;
}
export interface BranchStats {
  totalBranches: number; activeBranches: number; inactiveBranches: number;
  maintenanceBranches: number; totalCapacity: number; avgRating: number;
}
export interface BranchFilters {
  status?: BranchStatus; search?: string; isActive?: boolean;
  page?: number; limit?: number;
}
export interface CreateBranchPayload {
  name: string; slug: string; city: string; address: string;
  phone?: string; email?: string; capacity?: number;
  managerName?: string; openingHours?: string;
}
