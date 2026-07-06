import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import type { Prisma } from '../generated/prisma-tenant';

@Injectable()
export class PaymentsRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  private db(schemaName: string, tx?: Prisma.TransactionClient) {
    return tx ?? this.tenantPrisma.getClient(schemaName);
  }

  async createPayment(
    schemaName: string,
    data: Prisma.PaymentCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).payment.create({ data });
  }

  async findByOrder(
    schemaName: string,
    orderId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).payment.findMany({
      where: { orderId },
      include: { tip: true },
    });
  }

  async createTip(
    schemaName: string,
    data: Prisma.TipCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).tip.create({ data });
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

  async findOrderById(
    schemaName: string,
    orderId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).order.findUnique({
      where: { id: orderId },
      include: { table: true },
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

  async findPaymentByIdempotencyKey(
    schemaName: string,
    key: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).payment.findUnique({
      where: { idempotencyKey: key },
      include: { tip: true, order: true },
    });
  }
}
