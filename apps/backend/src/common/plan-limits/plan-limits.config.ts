import { TenantPlan } from '../../generated/prisma-system';

export type LimitedResource = 'branches' | 'menuItems' | 'staff';

export interface PlanLimits {
  maxBranches: number | null;
  maxMenuItems: number | null;
  maxStaff: number | null;
}

export const PLAN_LIMITS: Record<TenantPlan, PlanLimits> = {
  FREE: { maxBranches: 1, maxMenuItems: 15, maxStaff: 2 },
  BASIC: { maxBranches: 1, maxMenuItems: 40, maxStaff: 5 },
  PRO: { maxBranches: 5, maxMenuItems: 150, maxStaff: 20 },
  ENTERPRISE: { maxBranches: null, maxMenuItems: null, maxStaff: null },
};

export const RESOURCE_LIMIT_KEY: Record<LimitedResource, keyof PlanLimits> = {
  branches: 'maxBranches',
  menuItems: 'maxMenuItems',
  staff: 'maxStaff',
};

export const RESOURCE_LABEL: Record<LimitedResource, string> = {
  branches: 'branch',
  menuItems: 'menu item',
  staff: 'staff member',
};
