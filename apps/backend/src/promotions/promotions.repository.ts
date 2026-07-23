import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import type { Prisma } from '../generated/prisma-tenant';

@Injectable()
export class PromotionsRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  private db(schemaName: string, tx?: Prisma.TransactionClient) {
    return tx ?? this.tenantPrisma.getClient(schemaName);
  }

  private defaultInclude = {
    branch: true,
    promotionCategories: { include: { category: true } },
    promotionItems: { include: { menuItem: true } },
  };

  async create(schemaName: string, data: Prisma.PromotionCreateInput, tx?: Prisma.TransactionClient) {
    return this.db(schemaName, tx).promotion.create({
      data,
      include: this.defaultInclude,
    });
  }

  async findAll(schemaName: string, where?: Prisma.PromotionWhereInput, tx?: Prisma.TransactionClient) {
    return this.db(schemaName, tx).promotion.findMany({
      where,
      include: this.defaultInclude,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findActiveWithRelations(
    schemaName: string,
    now: Date = new Date(),
    branchId?: string,
    tx?: Prisma.TransactionClient,
  ) {
    const branchFilter: Prisma.PromotionWhereInput[] = branchId
      ? [{ branchId: null }, { branchId }]
      : [{ branchId: null }];

    return this.db(schemaName, tx).promotion.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          { OR: branchFilter },
        ],
      },
      include: this.defaultInclude,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findById(schemaName: string, id: string, tx?: Prisma.TransactionClient) {
    return this.db(schemaName, tx).promotion.findUnique({
      where: { id },
      include: {
        ...this.defaultInclude,
        orderPromotions: { take: 1 },
      },
    });
  }

  async update(schemaName: string, id: string, data: Prisma.PromotionUpdateInput, tx?: Prisma.TransactionClient) {
    return this.db(schemaName, tx).promotion.update({
      where: { id },
      data,
      include: this.defaultInclude,
    });
  }

  async delete(schemaName: string, id: string, tx?: Prisma.TransactionClient) {
    return this.db(schemaName, tx).promotion.delete({ where: { id } });
  }

  async deleteOrderPromotions(schemaName: string, orderId: string, tx?: Prisma.TransactionClient) {
    return this.db(schemaName, tx).orderPromotion.deleteMany({ where: { orderId } });
  }

  async createOrderPromotion(
    schemaName: string,
    data: Prisma.OrderPromotionCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).orderPromotion.create({ data });
  }
}
