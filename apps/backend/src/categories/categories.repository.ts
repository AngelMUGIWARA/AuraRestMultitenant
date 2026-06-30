import { Injectable } from "@nestjs/common";
import { PrismaClient } from "../generated/prisma-tenant";
import { TenantPrismaService } from "../database/tenant-prisma.service";

import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";

@Injectable()
export class CategoriesRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  private db(schemaName: string): PrismaClient {
    return this.tenantPrisma.getClient(schemaName);
  }

  async findAll(schemaName: string) {
    return this.db(schemaName).category.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
    });
  }

  async findById(schemaName: string, id: string) {
    return this.db(schemaName).category.findFirst({
      where: {
        id,
        isActive: true,
      },
    });
  }

  async create(schemaName: string, dto: CreateCategoryDto) {
    return this.db(schemaName).category.create({
      data: dto,
    });
  }

  async update(schemaName: string, id: string, dto: UpdateCategoryDto) {
    return this.db(schemaName).category.update({
      where: { id },
      data: dto,
    });
  }
  async getStats(schemaName: string) {
    const db = this.db(schemaName);

    const [totalCategories, activeCategories, inactiveCategories] =
      await Promise.all([
        db.category.count(),
        db.category.count({
          where: {
            isActive: true,
          },
        }),
        db.category.count({
          where: {
            isActive: false,
          },
        }),
      ]);

    return {
      totalCategories,
      activeCategories,
      inactiveCategories,
    };
  }

  async remove(schemaName: string, id: string) {
    return this.db(schemaName).category.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }
}
