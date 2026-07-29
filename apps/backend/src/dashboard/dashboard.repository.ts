import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import { PrismaClient } from '../generated/prisma-tenant';

/**
 * Acceso a datos del dashboard de administración.
 * Solo consultas agregadas — la composición de las respuestas vive en el
 * service.
 */
@Injectable()
export class DashboardRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  private db(schemaName: string): PrismaClient {
    return this.tenantPrisma.getClient(schemaName);
  }

  async getCounts(schemaName: string, monthStart: Date) {
    const db = this.db(schemaName);
    const [
      totalBranches,
      activeBranches,
      newBranchesThisMonth,
      totalUsers,
      activeUsers,
    ] = await Promise.all([
      db.branch.count(),
      db.branch.count({ where: { isActive: true } }),
      db.branch.count({ where: { createdAt: { gte: monthStart } } }),
      db.user.count(),
      db.user.count({ where: { status: 'ACTIVE' } }),
    ]);
    return {
      totalBranches,
      activeBranches,
      newBranchesThisMonth,
      totalUsers,
      activeUsers,
    };
  }

  /** Suma de órdenes PAID en [gte, lt). */
  async getRevenueBetween(schemaName: string, gte: Date, lt: Date) {
    const result = await this.db(schemaName).order.aggregate({
      where: { status: 'PAID', createdAt: { gte, lt } },
      _sum: { total: true },
    });
    return Number(result._sum.total ?? 0);
  }

  /** Órdenes PAID desde una fecha, para agrupar por mes en el service. */
  async getPaidOrdersSince(schemaName: string, since: Date) {
    return this.db(schemaName).order.findMany({
      where: { status: 'PAID', createdAt: { gte: since } },
      select: { total: true, createdAt: true },
    });
  }

  /** Fechas de alta de sucursales, para calcular cuántas existían por mes. */
  async getBranchCreationDates(schemaName: string) {
    return this.db(schemaName).branch.findMany({
      where: { isActive: true },
      select: { createdAt: true },
    });
  }

  async getRecentActivity(schemaName: string, limit: number) {
    return this.db(schemaName).activityLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true } },
        branch: { select: { name: true } },
      },
    });
  }

  async getBranchesWithMonthlyOrders(
    schemaName: string,
    limit: number,
    monthStart: Date,
  ) {
    const db = this.db(schemaName);
    const [branches, orderTotals] = await Promise.all([
      db.branch.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.order.groupBy({
        by: ['branchId'],
        where: { status: 'PAID', createdAt: { gte: monthStart } },
        _sum: { total: true },
        _count: { _all: true },
      }),
    ]);
    return { branches, orderTotals };
  }
}
