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

  async getCounts(schemaName: string, monthStart: Date, branchId?: string) {
    const db = this.db(schemaName);
    const branchFilter = branchId ? { id: branchId } : undefined;

    const [
      totalBranches,
      activeBranches,
      newBranchesThisMonth,
      totalUsers,
      activeUsers,
    ] = await Promise.all([
      db.branch.count({ where: branchFilter }),
      db.branch.count({ where: { ...branchFilter, isActive: true } }),
      db.branch.count({ where: { ...branchFilter, createdAt: { gte: monthStart } } }),
      branchId ? db.user.count({ where: { userBranches: { some: { branchId } } } }) : db.user.count(),
      branchId ? db.user.count({ where: { status: 'ACTIVE', userBranches: { some: { branchId } } } }) : db.user.count({ where: { status: 'ACTIVE' } }),
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
  async getRevenueBetween(schemaName: string, gte: Date, lt: Date, branchId?: string) {
    const result = await this.db(schemaName).order.aggregate({
      where: { status: 'PAID', createdAt: { gte, lt }, ...(branchId && { branchId }) },
      _sum: { total: true },
    });
    return Number(result._sum.total ?? 0);
  }

  /** Órdenes PAID desde una fecha, para agrupar por mes en el service. */
  async getPaidOrdersSince(schemaName: string, since: Date, branchId?: string) {
    return this.db(schemaName).order.findMany({
      where: { status: 'PAID', createdAt: { gte: since }, ...(branchId && { branchId }) },
      select: { total: true, createdAt: true },
    });
  }

  /** Fechas de alta de sucursales, para calcular cuántas existían por mes. */
  async getBranchCreationDates(schemaName: string, branchId?: string) {
    return this.db(schemaName).branch.findMany({
      where: { isActive: true, ...(branchId && { id: branchId }) },
      select: { createdAt: true },
    });
  }

  async getRecentActivity(schemaName: string, limit: number, branchId?: string) {
    return this.db(schemaName).activityLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      where: branchId ? { branchId } : undefined,
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
    branchId?: string,
  ) {
    const db = this.db(schemaName);
    const [branches, orderTotals] = await Promise.all([
      db.branch.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        where: branchId ? { id: branchId } : undefined,
      }),
      db.order.groupBy({
        by: ['branchId'],
        where: { status: 'PAID', createdAt: { gte: monthStart }, ...(branchId && { branchId }) },
        _sum: { total: true },
        _count: { _all: true },
      }),
    ]);
    return { branches, orderTotals };
  }
}
