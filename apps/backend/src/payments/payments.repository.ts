import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import { PrismaClient } from '../generated/prisma-tenant';
import type { Prisma } from '../generated/prisma-tenant';

@Injectable()
export class PaymentsRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  private db(schemaName: string): PrismaClient {
    return this.tenantPrisma.getClient(schemaName);
  }

  async createPayment(schemaName: string, data: Prisma.PaymentCreateInput) {
    return this.db(schemaName).payment.create({ data });
  }

  async findByOrder(schemaName: string, orderId: string) {
    return this.db(schemaName).payment.findMany({
      where: { orderId },
      include: { tip: true },
    });
  }

  async createTip(schemaName: string, data: Prisma.TipCreateInput) {
    return this.db(schemaName).tip.create({ data });
  }

  async updateOrderStatus(schemaName: string, orderId: string, status: string) {
    return this.db(schemaName).order.update({
      where: { id: orderId },
      data: { status: status as any },
    });
  }

  async findOrderById(schemaName: string, orderId: string) {
    return this.db(schemaName).order.findUnique({
      where: { id: orderId },
      include: { table: true },
    });
  }

  async updateTableStatus(schemaName: string, tableId: string, status: string) {
    return this.db(schemaName).restaurantTable.update({
      where: { id: tableId },
      data: { status: status as any },
    });
  }
}
