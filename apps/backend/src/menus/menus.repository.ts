import { Injectable } from "@nestjs/common";
import { TenantPrismaService } from "../database/tenant-prisma.service";
import { PrismaClient } from "../generated/prisma-tenant";

import { CreateMenuDto } from "./dto/create-menu.dto";
import { UpdateMenuDto } from "./dto/update-menu.dto";
import { MenuItemStatus } from "./dto/update-status.dto";

export interface MenuFilters {
  status?: string;
  search?: string;
}

@Injectable()
export class MenusRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  private db(schemaName: string): PrismaClient {
    return this.tenantPrisma.getClient(schemaName);
  }

  async findAll(schemaName: string, categoryId?: string, filters?: MenuFilters) {
    return this.db(schemaName).menuItem.findMany({
      where: {
        ...(categoryId ? { categoryId } : {}),
        ...(filters?.status ? { status: filters.status as MenuItemStatus } : {}),
        ...(filters?.search
          ? { name: { contains: filters.search, mode: "insensitive" } }
          : {}),
      },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(schemaName: string, id: string) {
    return this.db(schemaName).menuItem.findUnique({
      where: { id },
      include: { category: true },
    });
  }

  async create(schemaName: string, dto: CreateMenuDto) {
    const isAvailable = dto.isAvailable ?? true;
    return this.db(schemaName).menuItem.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        categoryId: dto.categoryId,
        imageUrl: dto.imageUrl,
        isAvailable,
        status: isAvailable ? MenuItemStatus.AVAILABLE : MenuItemStatus.UNAVAILABLE,
      },
    });
  }

  async update(schemaName: string, id: string, dto: UpdateMenuDto) {
    return this.db(schemaName).menuItem.update({
      where: { id },
      data: {
        ...dto,
        // isAvailable and status are kept in sync everywhere else (create/updateStatus/remove);
        // do the same here so re-editing a soft-deleted item can bring it back to AVAILABLE.
        ...(dto.isAvailable !== undefined
          ? { status: dto.isAvailable ? MenuItemStatus.AVAILABLE : MenuItemStatus.UNAVAILABLE }
          : {}),
      },
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

  async remove(schemaName: string, id: string) {
    return this.db(schemaName).menuItem.update({
      where: { id },
      data: { status: MenuItemStatus.UNAVAILABLE, isAvailable: false },
    });
  }

  async getStats(schemaName: string) {
    const db = this.db(schemaName);

    const [
      totalItems,
      availableItems,
      unavailableItems,
      outOfStockItems,
      totalCategories,
      avgPriceResult,
    ] = await Promise.all([
      db.menuItem.count(),
      db.menuItem.count({ where: { status: MenuItemStatus.AVAILABLE } }),
      db.menuItem.count({ where: { status: MenuItemStatus.UNAVAILABLE } }),
      db.menuItem.count({ where: { status: MenuItemStatus.OUT_OF_STOCK } }),
      db.category.count({ where: { isActive: true } }),
      db.menuItem.aggregate({
        _avg: { price: true },
        where: { status: MenuItemStatus.AVAILABLE },
      }),
    ]);

    return {
      totalItems,
      availableItems,
      unavailableItems,
      outOfStockItems,
      totalCategories,
      avgPrice: Number(avgPriceResult._avg.price ?? 0),
      popularItems: 0, // isPopular not in current schema
    };
  }
}
