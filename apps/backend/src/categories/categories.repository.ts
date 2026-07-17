import { Injectable } from "@nestjs/common";
import { PrismaClient } from "../generated/prisma-tenant";
import { TenantPrismaService } from "../database/tenant-prisma.service";

import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";

export interface CategoryFilters {
  isActive?: boolean;
  search?: string;
}

@Injectable()
export class CategoriesRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  private db(schemaName: string): PrismaClient {
    return this.tenantPrisma.getClient(schemaName);
  }

  async findAll(schemaName: string, filters?: CategoryFilters) {
    const rows = await this.db(schemaName).category.findMany({
      where: {
        ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
        ...(filters?.search
          ? { name: { contains: filters.search, mode: "insensitive" } }
          : {}),
      },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { menuItems: true } } },
    });

    // Flatten _count into productCount for the frontend type contract
    return rows.map(({ _count, ...rest }) => ({
      ...rest,
      productCount: _count.menuItems,
    }));
  }

  async findById(schemaName: string, id: string) {
    return this.db(schemaName).category.findUnique({
      where: { id },
    });
  }

  async create(schemaName: string, dto: CreateCategoryDto) {
    return this.db(schemaName).category.create({ data: dto });
  }

  async update(schemaName: string, id: string, dto: UpdateCategoryDto) {
    return this.db(schemaName).category.update({ where: { id }, data: dto });
  }

  async remove(schemaName: string, id: string) {
    return this.db(schemaName).category.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getStats(schemaName: string) {
    const db = this.db(schemaName);

    const [
      totalCategories,
      activeCategories,
      inactiveCategories,
      totalMenuItems,
      categoriesWithCount,
    ] = await Promise.all([
      db.category.count(),
      db.category.count({ where: { isActive: true } }),
      db.category.count({ where: { isActive: false } }),
      db.menuItem.count(),
      db.category.findMany({
        where: { isActive: true },
        select: { name: true, _count: { select: { menuItems: true } } },
      }),
    ]);

    const mostPopularCategory =
      categoriesWithCount.length > 0
        ? categoriesWithCount.reduce((prev, curr) =>
            curr._count.menuItems > prev._count.menuItems ? curr : prev,
          ).name
        : "—";

    const avgProductsPerCategory =
      totalCategories > 0
        ? Math.round((totalMenuItems / totalCategories) * 10) / 10
        : 0;

    return {
      totalCategories,
      activeCategories,
      inactiveCategories,
      // No parentId in current schema: all categories are root
      rootCategories: activeCategories,
      subCategories: 0,
      avgProductsPerCategory,
      mostPopularCategory,
    };
  }
}
