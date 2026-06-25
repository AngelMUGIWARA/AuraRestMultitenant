import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import { PrismaClient } from '../generated/prisma-tenant';
import type { Prisma } from '../generated/prisma-tenant';

@Injectable()
export class OrdersRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  private db(schemaName: string): PrismaClient {
    return this.tenantPrisma.getClient(schemaName);
  }

  async create(schemaName: string, data: Prisma.OrderCreateInput) {
    return this.db(schemaName).order.create({ data });
  }

  async findById(schemaName: string, id: string) {
    return this.db(schemaName).order.findUnique({
      where: { id },
      include: {
        orderItems: { include: { menuItem: true } },
        table: true,
        user: true,
        payments: true,
      },
    });
  }

  async findMany(
    schemaName: string,
    params: {
      where: Prisma.OrderWhereInput;
      orderBy?: Prisma.OrderOrderByWithRelationInput;
      skip?: number;
      take?: number;
    },
  ) {
    return this.db(schemaName).order.findMany({
      ...params,
      include: {
        orderItems: { include: { menuItem: true } },
        table: true,
        user: true,
        payments: true,
      },
    });
  }

  async count(schemaName: string, where: Prisma.OrderWhereInput) {
    return this.db(schemaName).order.count({ where });
  }

  async update(schemaName: string, id: string, data: Prisma.OrderUpdateInput) {
    return this.db(schemaName).order.update({
      where: { id },
      data,
      include: {
        orderItems: { include: { menuItem: true } },
        table: true,
        user: true,
        payments: true,
      },
    });
  }

  async updateTableStatus(schemaName: string, tableId: string, status: string) {
    return this.db(schemaName).restaurantTable.update({
      where: { id: tableId },
      data: { status: status as any },
    });
  }

  async findMenuItemsByIds(schemaName: string, ids: string[]) {
    return this.db(schemaName).menuItem.findMany({ where: { id: { in: ids } } });
  }
}
