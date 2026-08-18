import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import type { Prisma } from '../generated/prisma-tenant';

const TICKET_INCLUDE = {
  order: {
    include: {
      table: true,
      branch: true,
      orderItems: { include: { menuItem: true } },
    },
  },
  branch: true,
  items: {
    include: { orderItem: true },
  },
} satisfies Prisma.KitchenTicketInclude;

@Injectable()
export class KitchenRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  private db(schemaName: string, tx?: Prisma.TransactionClient) {
    return tx ?? this.tenantPrisma.getClient(schemaName);
  }

  async runTransaction<T>(
    schemaName: string,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.tenantPrisma.getClient(schemaName).$transaction(fn);
  }

  async findOrderForTicket(
    schemaName: string,
    orderId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).order.findUnique({
      where: { id: orderId },
      include: {
        table: true,
        branch: true,
        orderItems: { include: { menuItem: true } },
      },
    });
  }

  async findTicketByOrderId(
    schemaName: string,
    orderId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).kitchenTicket.findUnique({
      where: { orderId },
    });
  }

  async createTicket(
    schemaName: string,
    data: {
      orderId: string;
      branchId?: string;
      priority?: string;
    },
    items: Array<{
      orderItemId: string;
      menuItemName: string;
      quantity: number;
      notes?: string;
    }>,
    tx: Prisma.TransactionClient,
  ) {
    const ticket = await this.db(schemaName, tx).kitchenTicket.create({
      data: {
        orderId: data.orderId,
        branchId: data.branchId,
        priority: (data.priority as any) ?? 'NORMAL',
        items: {
          create: items.map((item) => ({
            orderItemId: item.orderItemId,
            menuItemName: item.menuItemName,
            quantity: item.quantity,
            notes: item.notes,
            status: 'PENDING',
          })),
        },
      },
      include: TICKET_INCLUDE,
    });

    return ticket;
  }

  async findTicketById(
    schemaName: string,
    id: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).kitchenTicket.findUnique({
      where: { id },
      include: TICKET_INCLUDE,
    });
  }

  async findTickets(
    schemaName: string,
    where: Prisma.KitchenTicketWhereInput,
    pagination: { skip: number; take: number },
  ) {
    const [data, total] = await Promise.all([
      this.db(schemaName).kitchenTicket.findMany({
        where,
        include: TICKET_INCLUDE,
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.db(schemaName).kitchenTicket.count({ where }),
    ]);

    return { data, total };
  }

  async updateTicketStatus(
    schemaName: string,
    id: string,
    data: {
      status: string;
      startedAt?: Date;
      readyAt?: Date;
      deliveredAt?: Date;
    },
    expectedVersion: number,
    tx?: Prisma.TransactionClient,
  ) {
    const result = await this.db(schemaName, tx).kitchenTicket.updateMany({
      where: { id, version: expectedVersion },
      data: {
        status: data.status as any,
        ...(data.startedAt && { startedAt: data.startedAt }),
        ...(data.readyAt && { readyAt: data.readyAt }),
        ...(data.deliveredAt && { deliveredAt: data.deliveredAt }),
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      return null;
    }

    return this.db(schemaName, tx).kitchenTicket.findUnique({
      where: { id },
      include: TICKET_INCLUDE,
    });
  }

  async updateItemStatus(
    schemaName: string,
    itemId: string,
    data: {
      status: string;
      startedAt?: Date;
      readyAt?: Date;
    },
    expectedVersion: number,
    tx?: Prisma.TransactionClient,
  ) {
    const result = await this.db(schemaName, tx).kitchenTicketItem.updateMany({
      where: { id: itemId, version: expectedVersion },
      data: {
        status: data.status as any,
        ...(data.startedAt && { startedAt: data.startedAt }),
        ...(data.readyAt && { readyAt: data.readyAt }),
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      return null;
    }

    return this.db(schemaName, tx).kitchenTicketItem.findUnique({
      where: { id: itemId },
    });
  }

  async findTicketItems(
    schemaName: string,
    ticketId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).kitchenTicketItem.findMany({
      where: { ticketId },
    });
  }

  async findItemWithTicket(
    schemaName: string,
    itemId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const items = await this.db(schemaName, tx).kitchenTicketItem.findMany({
      where: { id: itemId },
      include: { ticket: true },
    });
    return items[0] ?? null;
  }
}
