import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import type { Prisma, PrismaClient } from '../generated/prisma-tenant';

@Injectable()
export class DiscountsRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  private db(schemaName: string, tx?: Prisma.TransactionClient): PrismaClient {
    return (tx as PrismaClient) ?? this.tenantPrisma.getClient(schemaName);
  }

  async create(schemaName: string, data: Prisma.DiscountCreateInput, tx?: Prisma.TransactionClient) {
    return this.db(schemaName, tx).discount.create({ data });
  }

  async findAll(schemaName: string, where?: Prisma.DiscountWhereInput, tx?: Prisma.TransactionClient) {
    return this.db(schemaName, tx).discount.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActive(schemaName: string, now: Date = new Date(), branchId?: string, tx?: Prisma.TransactionClient) {
    const where: Prisma.DiscountWhereInput = {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    };

    if (branchId) {
      where.OR = [{ branchId: null }, { branchId }];
    }

    return this.db(schemaName, tx).discount.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(schemaName: string, id: string, tx?: Prisma.TransactionClient) {
    return this.db(schemaName, tx).discount.findUnique({ where: { id } });
  }

  async findByCode(schemaName: string, code: string, tx?: Prisma.TransactionClient) {
    return this.db(schemaName, tx).discount.findUnique({ where: { code } });
  }

  async update(schemaName: string, id: string, data: Prisma.DiscountUpdateInput, tx?: Prisma.TransactionClient) {
    return this.db(schemaName, tx).discount.update({ where: { id }, data });
  }

  async countOrdersUsingDiscount(schemaName: string, discountId: string, tx?: Prisma.TransactionClient) {
    return this.db(schemaName, tx).order.count({ where: { discountId } });
  }

  async delete(schemaName: string, id: string, tx?: Prisma.TransactionClient) {
    return this.db(schemaName, tx).discount.delete({ where: { id } });
  }
}
