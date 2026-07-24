import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaClient } from "../generated/prisma-tenant";
import { TenantPrismaService } from "../database/tenant-prisma.service";

import { CreateSupplierDto } from "./dto/create-supplier.dto";
import { UpdateSupplierDto } from "./dto/update-supplier.dto";
import { CreateInventoryItemDto } from "./dto/create-inventory-item.dto";
import { UpdateInventoryItemDto } from "./dto/update-inventory-item.dto";
import { RecipeIngredientDto } from "./dto/upsert-recipe.dto";

export interface MovementFilters {
  branchIds?: string[];
  itemId?: string;
  type?: string;
  from?: Date;
  to?: Date;
}

export interface CreateMovementData {
  itemId: string;
  branchId: string;
  type: string;
  quantity: number;
  /** Delta con signo que se aplica al stock */
  stockDelta: number;
  unitCost?: number;
  totalCost?: number;
  reason?: string;
  reference?: string;
  supplierId?: string;
  createdBy: string;
}

@Injectable()
export class InventoryRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  private db(schemaName: string): PrismaClient {
    return this.tenantPrisma.getClient(schemaName);
  }

  // ── Proveedores ──────────────────────────────────────────

  findSuppliers(schemaName: string, isActive?: boolean) {
    return this.db(schemaName).supplier.findMany({
      where: isActive !== undefined ? { isActive } : {},
      orderBy: { name: "asc" },
      include: { _count: { select: { items: true } } },
    });
  }

  findSupplierById(schemaName: string, id: string) {
    return this.db(schemaName).supplier.findUnique({ where: { id } });
  }

  createSupplier(schemaName: string, dto: CreateSupplierDto) {
    return this.db(schemaName).supplier.create({ data: dto });
  }

  updateSupplier(schemaName: string, id: string, dto: UpdateSupplierDto) {
    return this.db(schemaName).supplier.update({ where: { id }, data: dto });
  }

  deactivateSupplier(schemaName: string, id: string) {
    return this.db(schemaName).supplier.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ── Insumos ──────────────────────────────────────────────

  findItems(schemaName: string, filters?: { isActive?: boolean; search?: string }) {
    return this.db(schemaName).inventoryItem.findMany({
      where: {
        ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
        ...(filters?.search
          ? { name: { contains: filters.search, mode: "insensitive" } }
          : {}),
      },
      orderBy: { name: "asc" },
      include: {
        supplier: { select: { id: true, name: true } },
        stocks: true,
      },
    });
  }

  findItemById(schemaName: string, id: string) {
    return this.db(schemaName).inventoryItem.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, name: true } },
        stocks: true,
      },
    });
  }

  createItem(schemaName: string, dto: CreateInventoryItemDto) {
    return this.db(schemaName).inventoryItem.create({ data: dto });
  }

  updateItem(schemaName: string, id: string, dto: UpdateInventoryItemDto) {
    return this.db(schemaName).inventoryItem.update({ where: { id }, data: dto });
  }

  deactivateItem(schemaName: string, id: string) {
    return this.db(schemaName).inventoryItem.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ── Stock ────────────────────────────────────────────────

  findStocks(schemaName: string, branchIds?: string[]) {
    return this.db(schemaName).inventoryStock.findMany({
      where: branchIds ? { branchId: { in: branchIds } } : {},
      include: {
        item: true,
        branch: { select: { id: true, name: true, slug: true } },
      },
      orderBy: [{ branchId: "asc" }, { item: { name: "asc" } }],
    });
  }

  /** Existencias por debajo del mínimo configurado en el insumo */
  async findLowStock(schemaName: string, branchIds?: string[]) {
    const stocks = await this.findStocks(schemaName, branchIds);
    return stocks.filter(
      (s) => s.item.isActive && Number(s.quantity) < Number(s.item.minStock),
    );
  }

  // ── Movimientos ──────────────────────────────────────────

  findMovements(schemaName: string, filters: MovementFilters, limit = 100) {
    return this.db(schemaName).inventoryMovement.findMany({
      where: {
        ...(filters.branchIds ? { branchId: { in: filters.branchIds } } : {}),
        ...(filters.itemId ? { itemId: filters.itemId } : {}),
        ...(filters.type ? { type: filters.type as never } : {}),
        ...(filters.from || filters.to
          ? { createdAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
          : {}),
      },
      include: {
        item: { select: { id: true, name: true, unit: true } },
        branch: { select: { id: true, name: true, slug: true } },
        supplier: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /**
   * Crea el movimiento y aplica el delta al stock de forma atómica.
   * Lanza error si el stock resultante quedaría negativo.
   */
  async createMovementWithStock(schemaName: string, data: CreateMovementData) {
    const db = this.db(schemaName);
    return db.$transaction(async (tx) => {
      const stock = await tx.inventoryStock.upsert({
        where: { itemId_branchId: { itemId: data.itemId, branchId: data.branchId } },
        update: {},
        create: { itemId: data.itemId, branchId: data.branchId, quantity: 0 },
      });

      const newQuantity = Number(stock.quantity) + data.stockDelta;
      if (newQuantity < 0) {
        throw new BadRequestException(
          `Stock insuficiente: disponible ${Number(stock.quantity)}, se requieren ${Math.abs(data.stockDelta)}`,
        );
      }

      const movement = await tx.inventoryMovement.create({
        data: {
          itemId: data.itemId,
          branchId: data.branchId,
          type: data.type as never,
          quantity: data.quantity,
          unitCost: data.unitCost,
          totalCost: data.totalCost,
          reason: data.reason,
          reference: data.reference,
          supplierId: data.supplierId,
          createdBy: data.createdBy,
        },
        include: {
          item: { select: { id: true, name: true, unit: true } },
        },
      });

      const updated = await tx.inventoryStock.update({
        where: { id: stock.id },
        data: { quantity: newQuantity },
      });

      return { movement, stock: updated };
    });
  }

  // ── Recetas ──────────────────────────────────────────────

  findMenuItem(schemaName: string, menuItemId: string) {
    return this.db(schemaName).menuItem.findUnique({ where: { id: menuItemId } });
  }

  findRecipe(schemaName: string, menuItemId: string) {
    return this.db(schemaName).recipeIngredient.findMany({
      where: { menuItemId },
      include: { inventoryItem: true },
      orderBy: { inventoryItem: { name: "asc" } },
    });
  }

  /** Reemplaza la receta completa del platillo */
  async replaceRecipe(
    schemaName: string,
    menuItemId: string,
    ingredients: RecipeIngredientDto[],
  ) {
    const db = this.db(schemaName);
    await db.$transaction([
      db.recipeIngredient.deleteMany({ where: { menuItemId } }),
      db.recipeIngredient.createMany({
        data: ingredients.map((i) => ({
          menuItemId,
          inventoryItemId: i.inventoryItemId,
          quantity: i.quantity,
          notes: i.notes,
        })),
      }),
    ]);
    return this.findRecipe(schemaName, menuItemId);
  }

  // ── Disponibilidad ───────────────────────────────────────

  findMenuItemsWithRecipes(schemaName: string) {
    return this.db(schemaName).menuItem.findMany({
      include: {
        recipeIngredients: {
          include: { inventoryItem: { include: { stocks: true } } },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  // ── Scoping por sucursal ─────────────────────────────────

  /** Sucursales asignadas al usuario vía UserBranch (vacío = sin asignaciones) */
  async findUserBranchIds(schemaName: string, userId: string): Promise<string[]> {
    const rows = await this.db(schemaName).userBranch.findMany({
      where: { userId },
      select: { branchId: true },
    });
    return rows.map((r) => r.branchId);
  }

  findBranchById(schemaName: string, branchId: string) {
    return this.db(schemaName).branch.findUnique({ where: { id: branchId } });
  }
}
