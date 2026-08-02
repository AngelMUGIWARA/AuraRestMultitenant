import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../../database/tenant-prisma.service';
import { PrismaService } from '../../database/prisma.service';
import { PrismaClient as TenantPrismaClient } from '../../generated/prisma-tenant';
import { PrismaClient as SystemPrismaClient } from '../../generated/prisma-system';

@Injectable()
export class PublicMenuRepository {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly systemPrisma: PrismaService,
  ) {}

  private tenantDb(schemaName: string): TenantPrismaClient {
    return this.tenantPrisma.getClient(schemaName);
  }

  async getTenant(slug: string) {
    return this.systemPrisma.tenant.findUnique({
      where: { slug },
    });
  }

  async getBranch(schemaName: string, branchIdentifier: string) {
    const db = this.tenantDb(schemaName);
    return db.branch.findFirst({
      where: {
        OR: [{ id: branchIdentifier }, { slug: branchIdentifier }],
      },
    });
  }
  async getDefaultBranch(schemaName: string) {
    const db = this.tenantDb(schemaName);

    return db.branch.findFirst({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async getCategoriesWithItems(schemaName: string) {
    const db = this.tenantDb(schemaName);
    return db.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        sortOrder: true,
        menuItems: {
          where: {
            isAvailable: true,
            status: 'AVAILABLE',
          },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            imageUrl: true,
            isAvailable: true,
            status: true,
            categoryId: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async getLastUpdate(schemaName: string) {
    const db = this.tenantDb(schemaName);
    const lastCategory = await db.category.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });
    const lastMenuItem = await db.menuItem.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });

    const timestamps = [lastCategory?.updatedAt, lastMenuItem?.updatedAt].filter(
      (d) => d instanceof Date,
    ) as Date[];
    if (timestamps.length === 0) return new Date();

    return new Date(Math.max(...timestamps.map((d) => d.getTime())));
  }
}
