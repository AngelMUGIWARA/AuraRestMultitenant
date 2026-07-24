import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InventoryRepository, MovementFilters } from "./inventory.repository";

import { CreateSupplierDto } from "./dto/create-supplier.dto";
import { UpdateSupplierDto } from "./dto/update-supplier.dto";
import { CreateInventoryItemDto } from "./dto/create-inventory-item.dto";
import { UpdateInventoryItemDto } from "./dto/update-inventory-item.dto";
import { CreateMovementDto, MovementTypeDto } from "./dto/create-movement.dto";
import { UpsertRecipeDto } from "./dto/upsert-recipe.dto";

/**
 * Matriz de acceso del Módulo de Inventario
 * (la pertenencia a endpoints se refuerza con @Roles en el controller;
 *  aquí se aplican las reglas finas: tipo de movimiento, sucursal y costos)
 *
 *  OWNER / ADMIN  → acceso total (todas las sucursales, costos, configuración)
 *  MANAGER        → operación de SU sucursal: stock, entradas, ajustes,
 *                   mermas, movimientos y alertas
 *  CHEF           → consulta operativa sin costos; registra consumo y merma
 *  KITCHEN_STAFF  → consulta de disponibilidad; sin costos ni escritura
 *  CASHIER/WAITER → solo disponibilidad (available: true/false) vía /availability
 */

/** Roles que nunca deben ver costos ni datos de proveedor */
const COST_RESTRICTED_ROLES = new Set(["CHEF", "KITCHEN_STAFF"]);

/** Roles con visibilidad global de sucursales */
const GLOBAL_BRANCH_ROLES = new Set(["OWNER", "ADMIN"]);

/** Qué roles pueden registrar cada tipo de movimiento */
const MOVEMENT_ROLE_MATRIX: Record<MovementTypeDto, string[]> = {
  PURCHASE: ["OWNER", "ADMIN", "MANAGER"],
  ADJUSTMENT: ["OWNER", "ADMIN", "MANAGER"],
  WASTE: ["OWNER", "ADMIN", "MANAGER", "CHEF"],
  CONSUMPTION: ["OWNER", "ADMIN", "CHEF"],
  TRANSFER_IN: ["OWNER", "ADMIN"],
  TRANSFER_OUT: ["OWNER", "ADMIN"],
};

/** Tipos que suman stock; el resto resta (ADJUSTMENT usa direction) */
const INBOUND_TYPES = new Set<MovementTypeDto>(["PURCHASE", "TRANSFER_IN"]);

export interface RequestingUser {
  id: string;
  role: string;
}

@Injectable()
export class InventoryService {
  constructor(private readonly repo: InventoryRepository) {}

  // ── Scoping por sucursal ─────────────────────────────────

  /**
   * Sucursales visibles para el usuario:
   *  - OWNER/ADMIN → null (todas)
   *  - resto → las asignadas en UserBranch; si no tiene asignaciones se
   *    permite todo (tenants de una sola sucursal que no usan UserBranch)
   */
  private async resolveBranchScope(
    schemaName: string,
    user: RequestingUser,
  ): Promise<string[] | null> {
    if (GLOBAL_BRANCH_ROLES.has(user.role)) return null;
    const branchIds = await this.repo.findUserBranchIds(schemaName, user.id);
    return branchIds.length > 0 ? branchIds : null;
  }

  private async assertBranchAllowed(
    schemaName: string,
    user: RequestingUser,
    branchId: string,
  ) {
    const scope = await this.resolveBranchScope(schemaName, user);
    if (scope !== null && !scope.includes(branchId)) {
      throw new ForbiddenException(
        "No tienes autorización sobre esta sucursal",
      );
    }
  }

  // ── Ocultamiento de costos ───────────────────────────────

  private hideCosts(user: RequestingUser): boolean {
    return COST_RESTRICTED_ROLES.has(user.role);
  }

  private stripItemCosts<T extends Record<string, unknown>>(item: T) {
    const {
      costPerUnit: _cost,
      supplierId: _supplierId,
      supplier: _supplier,
      ...rest
    } = item as Record<string, unknown>;
    return rest;
  }

  // ── Proveedores (OWNER/ADMIN) ────────────────────────────

  async findSuppliers(schemaName: string, isActive?: boolean) {
    const rows = await this.repo.findSuppliers(schemaName, isActive);
    return rows.map(({ _count, ...rest }) => ({
      ...rest,
      itemCount: _count.items,
    }));
  }

  async findSupplier(schemaName: string, id: string) {
    const supplier = await this.repo.findSupplierById(schemaName, id);
    if (!supplier) throw new NotFoundException(`Proveedor ${id} no encontrado`);
    return supplier;
  }

  createSupplier(schemaName: string, dto: CreateSupplierDto) {
    return this.repo.createSupplier(schemaName, dto);
  }

  async updateSupplier(schemaName: string, id: string, dto: UpdateSupplierDto) {
    await this.findSupplier(schemaName, id);
    return this.repo.updateSupplier(schemaName, id, dto);
  }

  async removeSupplier(schemaName: string, id: string) {
    await this.findSupplier(schemaName, id);
    return this.repo.deactivateSupplier(schemaName, id);
  }

  // ── Insumos ──────────────────────────────────────────────

  async findItems(
    schemaName: string,
    user: RequestingUser,
    filters?: { isActive?: boolean; search?: string },
  ) {
    const scope = await this.resolveBranchScope(schemaName, user);
    const items = await this.repo.findItems(schemaName, filters);

    const mapped = items.map((item) => {
      const stocks = scope
        ? item.stocks.filter((s) => scope.includes(s.branchId))
        : item.stocks;
      const totalStock = stocks.reduce((sum, s) => sum + Number(s.quantity), 0);
      const base = {
        ...item,
        stocks,
        totalStock,
        belowMinimum: totalStock < Number(item.minStock),
      };
      return this.hideCosts(user) ? this.stripItemCosts(base) : base;
    });

    return { data: mapped, total: mapped.length };
  }

  async findItem(schemaName: string, user: RequestingUser, id: string) {
    const item = await this.repo.findItemById(schemaName, id);
    if (!item) throw new NotFoundException(`Insumo ${id} no encontrado`);
    return this.hideCosts(user) ? this.stripItemCosts(item) : item;
  }

  createItem(schemaName: string, dto: CreateInventoryItemDto) {
    return this.repo.createItem(schemaName, dto);
  }

  async updateItem(schemaName: string, id: string, dto: UpdateInventoryItemDto) {
    const item = await this.repo.findItemById(schemaName, id);
    if (!item) throw new NotFoundException(`Insumo ${id} no encontrado`);
    return this.repo.updateItem(schemaName, id, dto);
  }

  async removeItem(schemaName: string, id: string) {
    const item = await this.repo.findItemById(schemaName, id);
    if (!item) throw new NotFoundException(`Insumo ${id} no encontrado`);
    return this.repo.deactivateItem(schemaName, id);
  }

  // ── Stock y alertas ──────────────────────────────────────

  async findStocks(schemaName: string, user: RequestingUser, branchId?: string) {
    if (branchId) await this.assertBranchAllowed(schemaName, user, branchId);
    const scope = branchId
      ? [branchId]
      : ((await this.resolveBranchScope(schemaName, user)) ?? undefined);

    const stocks = await this.repo.findStocks(schemaName, scope);
    return stocks.map((s) => {
      const item = this.hideCosts(user)
        ? this.stripItemCosts(s.item)
        : s.item;
      return {
        ...s,
        item,
        belowMinimum: Number(s.quantity) < Number(s.item.minStock),
      };
    });
  }

  async findLowStockAlerts(
    schemaName: string,
    user: RequestingUser,
    branchId?: string,
  ) {
    if (branchId) await this.assertBranchAllowed(schemaName, user, branchId);
    const scope = branchId
      ? [branchId]
      : ((await this.resolveBranchScope(schemaName, user)) ?? undefined);

    const rows = await this.repo.findLowStock(schemaName, scope);
    return rows.map((s) => ({
      itemId: s.itemId,
      itemName: s.item.name,
      unit: s.item.unit,
      branchId: s.branchId,
      branchName: s.branch.name,
      quantity: Number(s.quantity),
      minStock: Number(s.item.minStock),
      deficit: +(Number(s.item.minStock) - Number(s.quantity)).toFixed(3),
    }));
  }

  // ── Movimientos ──────────────────────────────────────────

  async findMovements(
    schemaName: string,
    user: RequestingUser,
    filters: Omit<MovementFilters, "branchIds"> & { branchId?: string },
  ) {
    if (filters.branchId) {
      await this.assertBranchAllowed(schemaName, user, filters.branchId);
    }
    const scope = filters.branchId
      ? [filters.branchId]
      : ((await this.resolveBranchScope(schemaName, user)) ?? undefined);

    return this.repo.findMovements(schemaName, { ...filters, branchIds: scope });
  }

  async createMovement(
    schemaName: string,
    user: RequestingUser,
    dto: CreateMovementDto,
  ) {
    // 1. Rol autorizado para este tipo de movimiento
    const allowedRoles = MOVEMENT_ROLE_MATRIX[dto.type];
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        `El rol ${user.role} no puede registrar movimientos de tipo ${dto.type}`,
      );
    }

    // 2. Sucursal dentro del alcance del usuario
    await this.assertBranchAllowed(schemaName, user, dto.branchId);

    // 3. Entidades referenciadas válidas
    const [item, branch] = await Promise.all([
      this.repo.findItemById(schemaName, dto.itemId),
      this.repo.findBranchById(schemaName, dto.branchId),
    ]);
    if (!item || !item.isActive) {
      throw new BadRequestException("El insumo no existe o está inactivo");
    }
    if (!branch) throw new BadRequestException("La sucursal no existe");
    if (dto.supplierId && dto.type !== "PURCHASE") {
      throw new BadRequestException("supplierId solo aplica a movimientos PURCHASE");
    }

    // 4. Delta de stock según el tipo
    const inbound =
      INBOUND_TYPES.has(dto.type) ||
      (dto.type === "ADJUSTMENT" && dto.direction !== "OUT");
    const stockDelta = inbound ? dto.quantity : -dto.quantity;

    // Costos: solo roles con visibilidad de costos pueden registrarlos
    const unitCost = this.hideCosts(user) ? undefined : dto.unitCost;

    return this.repo.createMovementWithStock(schemaName, {
      itemId: dto.itemId,
      branchId: dto.branchId,
      type: dto.type,
      quantity: dto.quantity,
      stockDelta,
      unitCost,
      totalCost:
        unitCost !== undefined
          ? +(unitCost * dto.quantity).toFixed(2)
          : undefined,
      reason: dto.reason,
      reference: dto.reference,
      supplierId: dto.supplierId,
      createdBy: user.id,
    });
  }

  // ── Recetas ──────────────────────────────────────────────

  async findRecipe(schemaName: string, user: RequestingUser, menuItemId: string) {
    const menuItem = await this.repo.findMenuItem(schemaName, menuItemId);
    if (!menuItem) {
      throw new NotFoundException(`Platillo ${menuItemId} no encontrado`);
    }
    const ingredients = await this.repo.findRecipe(schemaName, menuItemId);
    return {
      menuItemId,
      menuItemName: menuItem.name,
      ingredients: ingredients.map((ing) => ({
        inventoryItemId: ing.inventoryItemId,
        quantity: Number(ing.quantity),
        notes: ing.notes,
        item: this.hideCosts(user)
          ? this.stripItemCosts(ing.inventoryItem)
          : ing.inventoryItem,
      })),
    };
  }

  async replaceRecipe(
    schemaName: string,
    user: RequestingUser,
    menuItemId: string,
    dto: UpsertRecipeDto,
  ) {
    const menuItem = await this.repo.findMenuItem(schemaName, menuItemId);
    if (!menuItem) {
      throw new NotFoundException(`Platillo ${menuItemId} no encontrado`);
    }
    for (const ing of dto.ingredients) {
      const item = await this.repo.findItemById(schemaName, ing.inventoryItemId);
      if (!item) {
        throw new BadRequestException(
          `Insumo ${ing.inventoryItemId} no existe`,
        );
      }
    }
    await this.repo.replaceRecipe(schemaName, menuItemId, dto.ingredients);
    return this.findRecipe(schemaName, user, menuItemId);
  }

  // ── Disponibilidad (todos los roles) ─────────────────────

  /**
   * Devuelve por platillo un `available: true/false` calculado con el flag
   * del menú y las existencias de sus ingredientes. Es la única vista de
   * inventario para CASHIER y WAITER.
   */
  async getAvailability(schemaName: string, branchId?: string) {
    const menuItems = await this.repo.findMenuItemsWithRecipes(schemaName);

    return menuItems.map((mi) => {
      const flagOk = mi.isAvailable && mi.status === "AVAILABLE";

      const ingredientsOk = mi.recipeIngredients.every((ri) => {
        const stocks = branchId
          ? ri.inventoryItem.stocks.filter((s) => s.branchId === branchId)
          : ri.inventoryItem.stocks;
        const available = stocks.reduce((sum, s) => sum + Number(s.quantity), 0);
        return available >= Number(ri.quantity);
      });

      return {
        menuItemId: mi.id,
        name: mi.name,
        available: flagOk && ingredientsOk,
      };
    });
  }
}
