import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import { Prisma } from '../generated/prisma-tenant';

@Injectable()
export class RefundsRepository {
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

  async createRefund(
    schemaName: string,
    data: Prisma.RefundCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).refund.create({ data });
  }

  async findRefundByIdempotencyKey(
    schemaName: string,
    key: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).refund.findUnique({
      where: { idempotencyKey: key },
      include: { order: true, payment: true },
    });
  }

  async findRefundsByOrder(
    schemaName: string,
    orderId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).refund.findMany({
      where: { orderId },
      include: { payment: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findRefundsByPayment(
    schemaName: string,
    paymentId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).refund.findMany({
      where: { paymentId },
      orderBy: { createdAt: 'desc' },
    });
  }
  
  async findPaymentById(
    schemaName: string,
    paymentId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).payment.findUnique({
      where: { id: paymentId },
      include: { refunds: true, order: true },
    });
  }

  async findOrderById(
    schemaName: string,
    orderId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).order.findUnique({
      where: { id: orderId },
      include: { payments: { include: { refunds: true } }, refunds: true },
    });
  }

  async updatePaymentStatus(
    schemaName: string,
    paymentId: string,
    status: any,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).payment.update({
      where: { id: paymentId },
      data: { status },
    });
  }

  async updateOrderVersion(
    schemaName: string,
    orderId: string,
    currentVersion: number,
    tx?: Prisma.TransactionClient,
  ) {
    const result = await this.db(schemaName, tx).order.updateMany({
      where: { id: orderId, version: currentVersion },
      data: { version: { increment: 1 } },
    });
    if (result.count === 0) {
      throw { code: 'P2025' };
    }
    return this.db(schemaName, tx).order.findUnique({ where: { id: orderId } });
  }
}
