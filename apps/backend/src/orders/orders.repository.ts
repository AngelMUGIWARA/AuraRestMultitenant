import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import type { Prisma } from '../generated/prisma-tenant';
import { TableStatus } from '../generated/prisma-tenant';

@Injectable()
export class OrdersRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  private db(schemaName: string, tx?: Prisma.TransactionClient) {
    return tx ?? this.tenantPrisma.getClient(schemaName);
  }

  private defaultInclude = {
    orderItems: { include: { menuItem: true, promotion: true } },
    table: true,
    user: true,
    payments: { include: { refunds: true } },
    refunds: true,
    discount: true,
    orderPromotions: { include: { promotion: true } },
    tip: true,
  };

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
      include: this.defaultInclude,
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
      include: this.defaultInclude,
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
      include: this.defaultInclude,
    });
  }

  async updateWithVersion(
    schemaName: string,
    id: string,
    version: number,
    data: Prisma.OrderUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const result = await this.db(schemaName, tx).order.updateMany({
      where: { id, version },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count === 0) {
      throw { code: 'P2025' };
    }
    const resultRecord = await this.db(schemaName, tx).order.findUnique({
      where: { id },
      include: this.defaultInclude,
    });
    if (!resultRecord) throw new Error('Order not found after update');
    return resultRecord;
  }

  async updateTableStatus(
    schemaName: string,
    tableId: string,
    status: TableStatus,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).restaurantTable.update({
      where: { id: tableId },
      data: { status },
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
    const order = await this.db(schemaName, tx).order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: { include: { menuItem: true } },
      },
    });

    const items = (order?.orderItems ?? []).map((oi) => ({
      orderItemId: oi.id,
      menuItemName: oi.menuItem?.name ?? 'Item',
      quantity: oi.quantity,
      notes: oi.notes ?? undefined,
    }));

    return this.db(schemaName, tx).kitchenTicket.create({
      data: {
        orderId,
        branchId: order?.branchId ?? undefined,
        items: {
          create: items.map((item) => ({
            orderItemId: item.orderItemId,
            menuItemName: item.menuItemName,
            quantity: item.quantity,
            notes: item.notes,
            status: 'PENDING' as const,
          })),
        },
      },
    });
  }

  async updateOrderItem(
    schemaName: string,
    id: string,
    data: Prisma.OrderItemUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).orderItem.update({
      where: { id },
      data,
    });
  }

  async createOrderItems(
    schemaName: string,
    orderId: string,
    items: Array<{
      menuItemId: string;
      quantity: number;
      unitPrice: string;
      subtotal: string;
      notes?: string;
    }>,
    tx?: Prisma.TransactionClient,
  ) {
    const client = this.db(schemaName, tx);
    const created: Array<Awaited<ReturnType<typeof client.orderItem.create>>> = [];
    for (const item of items) {
      const data: Prisma.OrderItemUncheckedCreateInput = { orderId, ...item };
      created.push(await client.orderItem.create({ data }));
    }
    return created;
  }

  async findKitchenTicketByOrderId(
    schemaName: string,
    orderId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).kitchenTicket.findUnique({ where: { orderId } });
  }

  async addKitchenTicketItems(
    schemaName: string,
    ticketId: string,
    items: Array<{
      orderItemId: string;
      menuItemName: string;
      quantity: number;
      notes?: string;
    }>,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).kitchenTicket.update({
      where: { id: ticketId },
      data: {
        items: {
          create: items.map((item) => ({
            orderItemId: item.orderItemId,
            menuItemName: item.menuItemName,
            quantity: item.quantity,
            notes: item.notes,
            status: 'PENDING' as const,
          })),
        },
      },
    });
  }

  async findUserBranchIds(schemaName: string, userId: string): Promise<string[]> {
    const rows = await this.db(schemaName).userBranch.findMany({
      where: { userId },
      select: { branchId: true },
    });
    return rows.map((r) => r.branchId);
  }
}
