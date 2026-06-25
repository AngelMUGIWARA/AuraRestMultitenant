import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import { PrismaClient } from '../generated/prisma-tenant';
import type { Prisma } from '../generated/prisma-tenant';

@Injectable()
export class DiscountsRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  private db(schemaName: string): PrismaClient {
    return this.tenantPrisma.getClient(schemaName);
  }

  async create(schemaName: string, data: Prisma.DiscountCreateInput) {
    return this.db(schemaName).discount.create({ data });
  }

  async findAll(schemaName: string, where?: Prisma.DiscountWhereInput) {
    return this.db(schemaName).discount.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(schemaName: string, id: string) {
    return this.db(schemaName).discount.findUnique({ where: { id } });
  }

  async findByCode(schemaName: string, code: string) {
    return this.db(schemaName).discount.findUnique({ where: { code } });
  }

  async update(schemaName: string, id: string, data: Prisma.DiscountUpdateInput) {
    return this.db(schemaName).discount.update({ where: { id }, data });
  }

  async delete(schemaName: string, id: string) {
    return this.db(schemaName).discount.delete({ where: { id } });
  }
}
