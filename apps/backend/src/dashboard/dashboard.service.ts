import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DashboardRepository } from './dashboard.repository';
import {
  ActivityItemDto,
  BranchSummaryDto,
  DashboardStatsDto,
  RevenuePointDto,
} from './dto/dashboard.dto';

const REVENUE_MONTHS = 8;

// Etiquetas cortas es-MX para el eje del gráfico de ingresos.
const MONTH_LABELS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

// El plan vive en el Tenant (schema public); las tarjetas del dashboard usan
// las claves de PLAN_LABELS del frontend.
const PLAN_MAP: Record<string, string> = {
  FREE: 'starter',
  BASIC: 'starter',
  PRO: 'professional',
  ENTERPRISE: 'enterprise',
};

@Injectable()
export class DashboardService {
  constructor(
    private readonly repo: DashboardRepository,
    private readonly systemDb: PrismaService,
  ) {}

  private monthStart(offset = 0): Date {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    d.setMonth(d.getMonth() - offset);
    return d;
  }

  async getStats(schemaName: string, branchId?: string): Promise<DashboardStatsDto> {
    const thisMonth = this.monthStart();
    const prevMonth = this.monthStart(1);

    const [counts, monthlyRevenue, prevRevenue] = await Promise.all([
      this.repo.getCounts(schemaName, thisMonth, branchId),
      this.repo.getRevenueBetween(schemaName, thisMonth, new Date(), branchId),
      this.repo.getRevenueBetween(schemaName, prevMonth, thisMonth, branchId),
    ]);

    // Sin mes anterior no hay base de comparación: 0% en lugar de infinito.
    const revenueGrowth =
      prevRevenue > 0
        ? ((monthlyRevenue - prevRevenue) / prevRevenue) * 100
        : 0;

    return {
      totalTenants: counts.totalBranches,
      activeTenants: counts.activeBranches,
      totalUsers: counts.totalUsers,
      activeUsers: counts.activeUsers,
      monthlyRevenue,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      avgRating: 0,
      newTenantsThisMonth: counts.newBranchesThisMonth,
    };
  }

  async getRevenueChart(schemaName: string, branchId?: string): Promise<RevenuePointDto[]> {
    const since = this.monthStart(REVENUE_MONTHS - 1);
    const [orders, branchDates] = await Promise.all([
      this.repo.getPaidOrdersSince(schemaName, since, branchId),
      this.repo.getBranchCreationDates(schemaName, branchId),
    ]);

    const points: RevenuePointDto[] = [];
    for (let i = REVENUE_MONTHS - 1; i >= 0; i--) {
      const start = this.monthStart(i);
      const end = this.monthStart(i - 1);
      const revenue = orders
        .filter((o) => o.createdAt >= start && o.createdAt < end)
        .reduce((sum, o) => sum + Number(o.total), 0);
      const tenants = branchDates.filter((b) => b.createdAt < end).length;
      points.push({
        month: MONTH_LABELS[start.getMonth()],
        revenue,
        tenants,
      });
    }
    return points;
  }

  async getRecentActivity(
    schemaName: string,
    limit: number,
    branchId?: string,
  ): Promise<ActivityItemDto[]> {
    const logs = await this.repo.getRecentActivity(schemaName, limit, branchId);
    return logs.map((log) => ({
      id: log.id,
      type: this.mapActivityType(log.action, log.entity),
      title: this.humanizeAction(log.action),
      description: `${log.entity} en ${log.branch.name}`,
      timestamp: log.createdAt.toISOString(),
      actorId: log.user.id,
      actorName: log.user.name,
    }));
  }

  async getBranchesSummary(
    schemaName: string,
    tenantSlug: string,
    limit: number,
    branchId?: string,
  ): Promise<BranchSummaryDto[]> {
    const [tenant, { branches, orderTotals }] = await Promise.all([
      this.systemDb.tenant.findUnique({
        where: { slug: tenantSlug },
        select: { plan: true },
      }),
      this.repo.getBranchesWithMonthlyOrders(
        schemaName,
        limit,
        this.monthStart(),
        branchId,
      ),
    ]);

    const plan = PLAN_MAP[tenant?.plan ?? 'FREE'] ?? 'starter';
    const totalsByBranch = new Map(
      orderTotals.map((t) => [
        t.branchId,
        { revenue: Number(t._sum.total ?? 0), orders: t._count._all },
      ]),
    );

    return branches.map((b) => {
      const totals = totalsByBranch.get(b.id);
      return {
        id: b.id,
        name: b.name,
        ownerEmail: b.email ?? b.manager ?? '',
        status: b.isActive ? 'active' : 'inactive',
        plan,
        monthlyRevenue: totals?.revenue ?? 0,
        monthlyOrders: totals?.orders ?? 0,
        avgRating: 0,
      };
    });
  }

  private mapActivityType(action: string, entity: string): string {
    if (action.includes('BRANCH_CREATED')) return 'tenant_created';
    if (action.includes('BRANCH_DEACTIVATED')) return 'tenant_suspended';
    if (entity === 'PAYMENT') return 'payment_received';
    if (entity === 'MENU' || entity === 'MENU_ITEM') return 'menu_published';
    return 'user_registered';
  }

  private humanizeAction(action: string): string {
    // BRANCH_CREATED -> "Branch created"
    const text = action.toLowerCase().replace(/_/g, ' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
}
