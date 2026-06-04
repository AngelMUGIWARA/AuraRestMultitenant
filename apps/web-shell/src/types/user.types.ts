export type UserRole = 'super_admin' | 'admin' | 'manager' | 'staff';
export type UserStatus = 'active' | 'inactive' | 'pending';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  branchId?: string;
  branchName?: string;
  tenantId?: string;
  tenantName?: string;
  avatarUrl?: string;
  phone?: string;
  lastLoginAt?: string;
  createdAt: string;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  pendingUsers: number;
  adminCount: number;
  managerCount: number;
  staffCount: number;
  newThisMonth: number;
}

export interface UserFilters {
  role?: UserRole;
  status?: UserStatus;
  branchId?: string;
  tenantId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface UpdateUserRolePayload {
  role: UserRole;
}

export interface InviteUserPayload {
  name: string;
  email: string;
  role: UserRole;
  branchId?: string;
}

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: 'super_admin';
  avatarUrl?: string;
  permissions: string[];
}
