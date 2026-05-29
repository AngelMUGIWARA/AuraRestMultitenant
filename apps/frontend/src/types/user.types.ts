export type UserRole = 'super_admin' | 'admin' | 'manager' | 'staff';
export type UserStatus = 'active' | 'inactive' | 'pending';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  tenantId?: string;
  tenantName?: string;
  avatarUrl?: string;
  lastLoginAt?: string;
  createdAt: string;
}

export interface UserFilters {
  role?: UserRole;
  status?: UserStatus;
  tenantId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface UpdateUserRolePayload {
  role: UserRole;
}

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: 'super_admin';
  avatarUrl?: string;
  permissions: string[];
}
