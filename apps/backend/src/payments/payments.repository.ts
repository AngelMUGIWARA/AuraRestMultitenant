import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import type { Prisma, TableStatus, OrderPaymentStatus } from '../generated/prisma-tenant';

@Injectable()
export class PaymentsRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  private db(schemaName: string, tx?: Prisma.TransactionClient) {
    return tx ?? this.tenantPrisma.getClient(schemaName);
  }

  async createPayment(schemaName: string, data: Prisma.PaymentCreateInput, tx?: Prisma.TransactionClient) {
    return this.db(schemaName, tx).payment.create({ data });
  }

  async findByOrder(schemaName: string, orderId: string, tx?: Prisma.TransactionClient) {
    return this.db(schemaName, tx).payment.findMany({
      where: { orderId },
      include: { tip: true },
    });
  }

  async createTip(schemaName: string, data: Prisma.TipCreateInput, tx?: Prisma.TransactionClient) {
    return this.db(schemaName, tx).tip.create({ data });
  }

  async updateOrderPaymentStatus(
    schemaName: string,
    orderId: string,
    paymentStatus: OrderPaymentStatus,
    currentVersion: number,
    tx?: Prisma.TransactionClient,
  ) {
    const result = await this.db(schemaName, tx).order.updateMany({
      where: { id: orderId, version: currentVersion },
      data: { paymentStatus, version: { increment: 1 } },
    });
    if (result.count === 0) {
      throw { code: 'P2025' };
    }
    const resultRecord = await this.db(schemaName, tx).order.findUnique({ where: { id: orderId } });
    if (!resultRecord) throw new Error('Order not found after update');
    return resultRecord;
  }

  async updateOrderStatus(
    schemaName: string,
    orderId: string,
    status: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).order.update({
      where: { id: orderId },
      data: { status: status as any },
    });
  }

  async findOrderById(schemaName: string, orderId: string, tx?: Prisma.TransactionClient) {
    return this.db(schemaName, tx).order.findUnique({
      where: { id: orderId },
      include: { table: true, payments: { include: { tip: true } }, refunds: true },
    });
  }

  async updateTableStatus(schemaName: string, tableId: string, status: TableStatus, tx?: Prisma.TransactionClient) {
    return this.db(schemaName, tx).restaurantTable.update({
      where: { id: tableId },
      data: { status },
    });
  }

  async runTransaction<T>(schemaName: string, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.tenantPrisma.getClient(schemaName).$transaction(fn);
  }

  async findPaymentByIdempotencyKey(schemaName: string, key: string, tx?: Prisma.TransactionClient) {
    return this.db(schemaName, tx).payment.findUnique({
      where: { idempotencyKey: key },
      include: { tip: true, order: true },
    });
  }
}
