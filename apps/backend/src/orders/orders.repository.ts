import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import type { Prisma } from '../generated/prisma-tenant';

@Injectable()
export class OrdersRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  private db(schemaName: string, tx?: Prisma.TransactionClient) {
    return tx ?? this.tenantPrisma.getClient(schemaName);
  }

  async create(
    schemaName: string,
    data: Prisma.OrderCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).order.create({ data });
  }

  async findById(
    schemaName: string,
    id: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).order.findUnique({
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
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).order.findMany({
      ...params,
      include: {
        orderItems: { include: { menuItem: true } },
        table: true,
        user: true,
        payments: true,
      },
    });
  }

  async count(
    schemaName: string,
    where: Prisma.OrderWhereInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).order.count({ where });
  }

  async update(
    schemaName: string,
    id: string,
    data: Prisma.OrderUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).order.update({
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

  async updateWithVersion(
    schemaName: string,
    id: string,
    version: number,
    data: Prisma.OrderUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).order.update({
      where: { id, version },
      data: { ...data, version: { increment: 1 } },
      include: {
        orderItems: { include: { menuItem: true } },
        table: true,
        user: true,
        payments: true,
      },
    });
  }

  async updateTableStatus(
    schemaName: string,
    tableId: string,
    status: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).restaurantTable.update({
      where: { id: tableId },
      data: { status: status as any },
    });
  }

  async runTransaction<T>(
    schemaName: string,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.tenantPrisma.getClient(schemaName).$transaction(fn);
  }

  async findMenuItemsByIds(
    schemaName: string,
    ids: string[],
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).menuItem.findMany({ where: { id: { in: ids } } });
  }

  async findTableById(
    schemaName: string,
    tableId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).restaurantTable.findUnique({ where: { id: tableId } });
  }

  async createKitchenTicket(
    schemaName: string,
    orderId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).kitchenTicket.create({
      data: { orderId },
    });
  }
}
