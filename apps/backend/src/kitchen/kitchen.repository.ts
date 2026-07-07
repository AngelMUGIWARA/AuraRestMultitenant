import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import type { Prisma } from '../generated/prisma-tenant';

@Injectable()
export class KitchenRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  private db(schemaName: string, tx?: Prisma.TransactionClient) {
    return tx ?? this.tenantPrisma.getClient(schemaName);
  }

  async findQueue(schemaName: string, branchId?: string) {
    const where: any = {
      status: { in: ['PENDING', 'IN_PROGRESS'] },
    };
    if (branchId) {
      where.order = { table: { branchId } };
    }
    return this.db(schemaName).kitchenTicket.findMany({
      where,
      include: {
        order: {
          include: {
            table: true,
            orderItems: { include: { menuItem: true } },
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    });
  }

  async findById(schemaName: string, id: string, tx?: Prisma.TransactionClient) {
    return this.db(schemaName, tx).kitchenTicket.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            table: true,
            orderItems: { include: { menuItem: true } },
          },
        },
      },
    });
  }

  async create(
    schemaName: string,
    orderId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).kitchenTicket.create({
      data: { orderId },
      include: {
        order: {
          include: {
            table: true,
            orderItems: { include: { menuItem: true } },
          },
        },
      },
    });
  }

  async updateStatus(
    schemaName: string,
    id: string,
    status: string,
    tx?: Prisma.TransactionClient,
  ) {
    const data: any = { status };
    if (status === 'IN_PROGRESS') data.startedAt = new Date();
    if (status === 'READY' || status === 'DELIVERED') data.completedAt = new Date();
    return this.db(schemaName, tx).kitchenTicket.update({
      where: { id },
      data,
      include: {
        order: {
          include: {
            table: true,
            orderItems: { include: { menuItem: true } },
          },
        },
      },
    });
  }

  async findTicketByOrderId(schemaName: string, orderId: string, tx?: Prisma.TransactionClient) {
    return this.db(schemaName, tx).kitchenTicket.findUnique({
      where: { orderId },
    });
  }

  async updateOrderStatus(
    schemaName: string,
    orderId: string,
    status: string,
  ) {
    return this.db(schemaName).order.update({
      where: { id: orderId },
      data: { status: status as any },
    });
  }
}
