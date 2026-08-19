import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";

import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";

import { InventoryService } from "./inventory.service";

import { CreateSupplierDto } from "./dto/create-supplier.dto";
import { UpdateSupplierDto } from "./dto/update-supplier.dto";
import { CreateInventoryItemDto } from "./dto/create-inventory-item.dto";
import { UpdateInventoryItemDto } from "./dto/update-inventory-item.dto";
import { CreateMovementDto } from "./dto/create-movement.dto";
import { UpsertRecipeDto } from "./dto/upsert-recipe.dto";

import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { TenantGuard } from "../common/guards/tenant.guard";

import { Roles } from "../common/decorators/roles.decorator";
import {
  CurrentTenant,
  TenantContext,
} from "../common/decorators/current-tenant.decorator";
import {
  AuthenticatedUser,
  CurrentUser,
} from "../common/decorators/current-user.decorator";
import { TransformInterceptor } from "../common/interceptors/transform.interceptor";

@ApiTags("Inventory")
@ApiBearerAuth("JWT")
@ApiSecurity("TenantSlug")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@UseInterceptors(TransformInterceptor)
@Controller("admin/inventory")
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  // ── Disponibilidad — única vista para CASHIER / WAITER ───

  @Get("availability")
  @Roles("OWNER", "MANAGER", "KITCHEN_STAFF", "CASHIER", "WAITER")
  @ApiOperation({
    summary: "Disponibilidad de platillos (available: true/false)",
    operationId: "inventory_availability",
  })
  @ApiQuery({ name: "branchId", required: false })
  getAvailability(
    @CurrentTenant() tenant: TenantContext,
    @Query("branchId") branchId?: string,
  ) {
    return this.service.getAvailability(tenant.schemaName, branchId);
  }

  // ── Proveedores (solo OWNER) ──────────────────────────────

  @Get("suppliers")
  @Roles("OWNER")
  @ApiOperation({ summary: "Listar proveedores", operationId: "inventory_suppliers_findAll" })
  @ApiQuery({ name: "isActive", required: false, type: Boolean })
  findSuppliers(
    @CurrentTenant() tenant: TenantContext,
    @Query("isActive") isActive?: string,
  ) {
    const parsed =
      isActive === "true" ? true : isActive === "false" ? false : undefined;
    return this.service.findSuppliers(tenant.schemaName, parsed);
  }

  @Post("suppliers")
  @Roles("OWNER")
  @ApiOperation({ summary: "Crear proveedor", operationId: "inventory_suppliers_create" })
  createSupplier(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateSupplierDto,
  ) {
    return this.service.createSupplier(tenant.schemaName, dto);
  }

  @Put("suppliers/:id")
  @Roles("OWNER")
  @ApiOperation({ summary: "Actualizar proveedor", operationId: "inventory_suppliers_update" })
  updateSupplier(
    @CurrentTenant() tenant: TenantContext,
    @Param("id") id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.service.updateSupplier(tenant.schemaName, id, dto);
  }

  @Delete("suppliers/:id")
  @Roles("OWNER")
  @ApiOperation({ summary: "Desactivar proveedor (soft-delete)", operationId: "inventory_suppliers_remove" })
  removeSupplier(@CurrentTenant() tenant: TenantContext, @Param("id") id: string) {
    return this.service.removeSupplier(tenant.schemaName, id);
  }

  // ── Insumos ──────────────────────────────────────────────

  @Get("items")
  @Roles("OWNER", "MANAGER", "KITCHEN_STAFF")
  @ApiOperation({
    summary: "Listar insumos (KITCHEN_STAFF sin costos ni proveedor)",
    operationId: "inventory_items_findAll",
  })
  @ApiQuery({ name: "isActive", required: false, type: Boolean })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "branchId", required: false })
  findItems(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Query("isActive") isActive?: string,
    @Query("search") search?: string,
    @Query("branchId") branchId?: string,
  ) {
    const parsed =
      isActive === "true" ? true : isActive === "false" ? false : undefined;
    return this.service.findItems(tenant.schemaName, user, {
      isActive: parsed,
      search,
      branchId,
    });
  }

  @Get("items/:id")
  @Roles("OWNER", "MANAGER", "KITCHEN_STAFF")
  @ApiOperation({ summary: "Obtener insumo por ID", operationId: "inventory_items_findOne" })
  @ApiResponse({ status: 404, description: "Insumo no encontrado" })
  findItem(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.service.findItem(tenant.schemaName, user, id);
  }

  @Post("items")
  @Roles("OWNER")
  @ApiOperation({ summary: "Crear insumo", operationId: "inventory_items_create" })
  createItem(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateInventoryItemDto,
  ) {
    return this.service.createItem(tenant.schemaName, dto);
  }

  @Put("items/:id")
  @Roles("OWNER")
  @ApiOperation({ summary: "Actualizar insumo", operationId: "inventory_items_update" })
  updateItem(
    @CurrentTenant() tenant: TenantContext,
    @Param("id") id: string,
    @Body() dto: UpdateInventoryItemDto,
  ) {
    return this.service.updateItem(tenant.schemaName, id, dto);
  }

  @Delete("items/:id")
  @Roles("OWNER")
  @ApiOperation({ summary: "Desactivar insumo (soft-delete)", operationId: "inventory_items_remove" })
  removeItem(@CurrentTenant() tenant: TenantContext, @Param("id") id: string) {
    return this.service.removeItem(tenant.schemaName, id);
  }

  // ── Stock y alertas ──────────────────────────────────────

  @Get("stock")
  @Roles("OWNER", "MANAGER", "KITCHEN_STAFF")
  @ApiOperation({
    summary: "Existencias por sucursal (MANAGER/KITCHEN_STAFF limitados a las suyas)",
    operationId: "inventory_stock_find",
  })
  @ApiQuery({ name: "branchId", required: false })
  findStocks(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Query("branchId") branchId?: string,
  ) {
    return this.service.findStocks(tenant.schemaName, user, branchId);
  }

  @Get("stock/alerts")
  @Roles("OWNER", "MANAGER")
  @ApiOperation({
    summary: "Alertas de stock bajo mínimo",
    operationId: "inventory_stock_alerts",
  })
  @ApiQuery({ name: "branchId", required: false })
  findLowStockAlerts(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Query("branchId") branchId?: string,
  ) {
    return this.service.findLowStockAlerts(tenant.schemaName, user, branchId);
  }

  // ── Movimientos ──────────────────────────────────────────

  @Get("movements")
  @Roles("OWNER", "MANAGER")
  @ApiOperation({
    summary: "Kardex de movimientos (MANAGER limitado a su sucursal)",
    operationId: "inventory_movements_findAll",
  })
  @ApiQuery({ name: "branchId", required: false })
  @ApiQuery({ name: "itemId", required: false })
  @ApiQuery({ name: "type", required: false })
  findMovements(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Query("branchId") branchId?: string,
    @Query("itemId") itemId?: string,
    @Query("type") type?: string,
  ) {
    return this.service.findMovements(tenant.schemaName, user, {
      branchId,
      itemId,
      type,
    });
  }

  @Post("movements")
  @Roles("OWNER", "MANAGER", "KITCHEN_STAFF")
  @ApiOperation({
    summary:
      "Registrar movimiento y actualizar stock (permiso fino por tipo: " +
      "PURCHASE/ADJUSTMENT→OWNER/MANAGER, WASTE→+KITCHEN_STAFF, " +
      "CONSUMPTION→OWNER/KITCHEN_STAFF, TRANSFER→OWNER)",
    operationId: "inventory_movements_create",
  })
  @ApiResponse({ status: 400, description: "Stock insuficiente o datos inválidos" })
  @ApiResponse({ status: 403, description: "Rol sin permiso para este tipo de movimiento" })
  createMovement(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMovementDto,
  ) {
    return this.service.createMovement(tenant.schemaName, user, dto);
  }

  // ── Recetas ──────────────────────────────────────────────

  @Get("recipes/:menuItemId")
  @Roles("OWNER", "MANAGER", "KITCHEN_STAFF")
  @ApiOperation({
    summary: "Receta de un platillo (KITCHEN_STAFF sin costos)",
    operationId: "inventory_recipes_findOne",
  })
  findRecipe(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("menuItemId") menuItemId: string,
  ) {
    return this.service.findRecipe(tenant.schemaName, user, menuItemId);
  }

  @Put("recipes/:menuItemId")
  @Roles("OWNER")
  @ApiOperation({
    summary: "Reemplazar receta completa de un platillo",
    operationId: "inventory_recipes_replace",
  })
  replaceRecipe(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("menuItemId") menuItemId: string,
    @Body() dto: UpsertRecipeDto,
  ) {
    return this.service.replaceRecipe(tenant.schemaName, user, menuItemId, dto);
  }
}
