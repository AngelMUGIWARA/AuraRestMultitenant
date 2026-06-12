export interface DashboardStats {
  totalTenants: number; activeTenants: number; totalUsers: number; activeUsers: number;
  monthlyRevenue: number; revenueGrowth: number; avgRating: number; newTenantsThisMonth: number;
}
export interface RevenueDataPoint { month: string; revenue: number; tenants: number; }
export type ActivityEventType = 'tenant_created'|'user_registered'|'plan_upgraded'|'payment_received'|'tenant_suspended'|'menu_published';
export interface ActivityItem {
  id: string; type: ActivityEventType; title: string; description: string;
  timestamp: string; actorId: string; actorName: string;
  metadata?: Record<string, string | number>;
}
