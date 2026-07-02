import { Injectable } from "@nestjs/common";
import { TenantPrismaService } from "../database/tenant-prisma.service";
import { PrismaClient } from "../generated/prisma-tenant";

import { CreateMenuDto } from "./dto/create-menu.dto";
import { UpdateMenuDto } from "./dto/update-menu.dto";
import { MenuItemStatus } from "./dto/update-status.dto";

@Injectable()
export class MenusRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  private db(schemaName: string): PrismaClient {
    return this.tenantPrisma.getClient(schemaName);
  }

  async findAll(schemaName: string, categoryId?: string) {
    return this.db(schemaName).menuItem.findMany({
      where: categoryId
        ? {
            categoryId,
          }
        : undefined,

      include: {
        category: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findById(schemaName: string, id: string) {
    return this.db(schemaName).menuItem.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });
  }

  async create(schemaName: string, dto: CreateMenuDto) {
    return this.db(schemaName).menuItem.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        categoryId: dto.categoryId,
        imageUrl: dto.imageUrl,
        isAvailable: dto.isAvailable ?? true,
      },
    });
  }

  async update(schemaName: string, id: string, dto: UpdateMenuDto) {
    return this.db(schemaName).menuItem.update({
      where: { id },
      data: dto,
    });
  }

  async updatePrice(schemaName: string, id: string, price: number) {
    return this.db(schemaName).menuItem.update({
      where: { id },
      data: { price },
    });
  }

  async updateStatus(schemaName: string, id: string, status: MenuItemStatus) {
    return this.db(schemaName).menuItem.update({
      where: { id },
      data: {
        status,
        isAvailable: status === MenuItemStatus.AVAILABLE,
      },
    });
  }
  async getStats(schemaName: string) {
    const db = this.db(schemaName);

    const [
      totalProducts,
      availableProducts,
      unavailableProducts,
      outOfStockProducts,
    ] = await Promise.all([
      db.menuItem.count(),
      db.menuItem.count({
        where: { status: "AVAILABLE" as any },
      }),
      db.menuItem.count({
        where: { status: "UNAVAILABLE" as any },
      }),
      db.menuItem.count({
        where: { status: "OUT_OF_STOCK" as any },
      }),
    ]);

    return {
      totalProducts,
      availableProducts,
      unavailableProducts,
      outOfStockProducts,
    };
  }

  async remove(schemaName: string, id: string) {
    return this.db(schemaName).menuItem.update({
      where: { id },
      data: {
        status: MenuItemStatus.UNAVAILABLE,
        isAvailable: false,
      },
    });
  }
}
