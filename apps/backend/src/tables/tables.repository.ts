import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import { PrismaClient } from '../generated/prisma-tenant';
import type { Prisma } from '../generated/prisma-tenant';

@Injectable()
export class TablesRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  private db(schemaName: string): PrismaClient {
    return this.tenantPrisma.getClient(schemaName);
  }

  async findAll(schemaName: string, where?: Prisma.RestaurantTableWhereInput) {
    return this.db(schemaName).restaurantTable.findMany({
      where,
      orderBy: { number: 'asc' },
    });
  }

  async findById(schemaName: string, id: string) {
    return this.db(schemaName).restaurantTable.findUnique({ where: { id } });
  }

  async updateStatus(schemaName: string, id: string, status: string) {
    return this.db(schemaName).restaurantTable.update({
      where: { id },
      data: { status: status as any },
    });
  }
}
