import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import { PrismaClient } from '../generated/prisma-tenant';
import type { Prisma } from '../generated/prisma-tenant';
import { TableStatus } from '../generated/prisma-tenant';

@Injectable()
export class TablesRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  private db(schemaName: string): PrismaClient {
    return this.tenantPrisma.getClient(schemaName);
  }

  async findAll(schemaName: string, where?: Prisma.RestaurantTableWhereInput) {
    return this.db(schemaName).restaurantTable.findMany({
      where,
      orderBy: { number: 'asc' },
      include: {
        orders: {
          where: { status: { notIn: ['PAID', 'CANCELLED'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            user: { select: { id: true, name: true, email: true } },
            orderItems: {
              include: { menuItem: { select: { id: true, name: true, price: true } } },
            },
          },
        },
      },
    });
  }

  async findById(schemaName: string, id: string) {
    return this.db(schemaName).restaurantTable.findUnique({ where: { id } });
  }

  async findByNumberAndBranch(schemaName: string, number: number, branchId: string) {
    return this.db(schemaName).restaurantTable.findUnique({
      where: { number_branchId: { number, branchId } },
    });
  }

  async updateStatus(schemaName: string, id: string, status: TableStatus) {
    return this.db(schemaName).restaurantTable.update({
      where: { id },
      data: { status },
    });
  }

  async create(schemaName: string, data: Prisma.RestaurantTableCreateInput) {
    return this.db(schemaName).restaurantTable.create({ data });
  }

  async update(schemaName: string, id: string, data: Prisma.RestaurantTableUpdateInput) {
    return this.db(schemaName).restaurantTable.update({
      where: { id },
      data,
    });
  }

  async delete(schemaName: string, id: string) {
    return this.db(schemaName).restaurantTable.delete({ where: { id } });
  }

  async hasHistory(schemaName: string, tableId: string): Promise<boolean> {
    const [orderCount, reservationCount] = await Promise.all([
      this.db(schemaName).order.count({ where: { tableId } }),
      this.db(schemaName).reservation.count({ where: { tableId } }),
    ]);
    return orderCount > 0 || reservationCount > 0;
  }

  async findUserBranchIds(schemaName: string, userId: string): Promise<string[]> {
    const rows = await this.db(schemaName).userBranch.findMany({
      where: { userId },
      select: { branchId: true },
    });
    return rows.map((r) => r.branchId);
  }
}
