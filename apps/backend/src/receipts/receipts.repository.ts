import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import type { Prisma } from '../generated/prisma-tenant';

@Injectable()
export class ReceiptsRepository {
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

  async findById(schemaName: string, id: string) {
    return this.db(schemaName).receipt.findUnique({
      where: { id },
      include: { order: true, branch: true, user: true },
    });
  }

  async findByOrder(schemaName: string, orderId: string) {
    return this.db(schemaName).receipt.findUnique({
      where: { orderId },
      include: { order: true, branch: true, user: true },
    });
  }

  async findByIdempotencyKey(schemaName: string, key: string) {
    return this.db(schemaName).receipt.findUnique({
      where: { idempotencyKey: key },
    });
  }

  async create(
    schemaName: string,
    data: Prisma.ReceiptCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).receipt.create({ data });
  }

  async findOrderForReceipt(schemaName: string, orderId: string, tx: Prisma.TransactionClient) {
    return (tx as any).order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: { include: { menuItem: true } },
        orderPromotions: true,
        payments: true,
        refunds: true,
        tip: true,
        table: true,
        branch: true,
      },
    });
  }

  async findMany(
    schemaName: string,
    params: {
      where: Prisma.ReceiptWhereInput;
      orderBy?: Prisma.ReceiptOrderByWithRelationInput;
      skip?: number;
      take?: number;
    },
  ) {
    return this.db(schemaName).receipt.findMany({
      ...params,
      include: { order: true, branch: true, user: true },
    });
  }

  async count(schemaName: string, where: Prisma.ReceiptWhereInput) {
    return this.db(schemaName).receipt.count({ where });
  }
}
