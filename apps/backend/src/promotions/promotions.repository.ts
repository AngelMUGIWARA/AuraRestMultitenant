import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import { PrismaClient } from '../generated/prisma-tenant';
import type { Prisma } from '../generated/prisma-tenant';

@Injectable()
export class PromotionsRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  private db(schemaName: string): PrismaClient {
    return this.tenantPrisma.getClient(schemaName);
  }

  async create(schemaName: string, data: Prisma.PromotionCreateInput) {
    return this.db(schemaName).promotion.create({ data });
  }

  async findAll(schemaName: string, where?: Prisma.PromotionWhereInput) {
    return this.db(schemaName).promotion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActive(schemaName: string) {
    const now = new Date();
    return this.db(schemaName).promotion.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(schemaName: string, id: string) {
    return this.db(schemaName).promotion.findUnique({ where: { id } });
  }

  async update(schemaName: string, id: string, data: Prisma.PromotionUpdateInput) {
    return this.db(schemaName).promotion.update({ where: { id }, data });
  }

  async delete(schemaName: string, id: string) {
    return this.db(schemaName).promotion.delete({ where: { id } });
  }
}
