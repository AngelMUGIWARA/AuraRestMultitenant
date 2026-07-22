import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
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

import { MenusService } from "./menus.service";

import { CreateMenuDto } from "./dto/create-menu.dto";
import { UpdateMenuDto } from "./dto/update-menu.dto";
import { UpdatePriceDto } from "./dto/update-price.dto";
import { UpdateStatusDto } from "./dto/update-status.dto";
import { MenuResponseDto } from "./dto/menu-response.dto";
import { MenuStatsDto } from "./dto/menu-stats.dto";

import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { TenantGuard } from "../common/guards/tenant.guard";

import { Roles } from "../common/decorators/roles.decorator";

import {
  CurrentTenant,
  TenantContext,
} from "../common/decorators/current-tenant.decorator";

import { TransformInterceptor } from "../common/interceptors/transform.interceptor";

@ApiTags("Menus")
@ApiBearerAuth("JWT")
@ApiSecurity("TenantSlug")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@UseInterceptors(TransformInterceptor)
@Controller("admin/menus")
export class MenusController {
  constructor(private readonly service: MenusService) {}

  @Get()
  @Roles("OWNER", "ADMIN", "MANAGER", "WAITER", "CASHIER")
  @ApiOperation({ summary: "Listar menú", operationId: "menus_findAll" })
  @ApiResponse({ status: 200, type: [MenuResponseDto] })
  @ApiQuery({ name: "categoryId", required: false, type: String, description: "Filtrar por categoría" })
  @ApiQuery({ name: "status", required: false, enum: ["AVAILABLE", "UNAVAILABLE", "OUT_OF_STOCK"] })
  @ApiQuery({ name: "search", required: false, type: String })
  findAll(
    @CurrentTenant() tenant: TenantContext,
    @Query("categoryId") categoryId?: string,
    @Query("status") status?: string,
    @Query("search") search?: string,
  ) {
    return this.service.findAll(tenant.schemaName, categoryId, { status, search });
  }

  @Get("stats")
  @Roles("OWNER", "ADMIN", "MANAGER")
  @ApiOperation({ summary: "Estadísticas del menú", operationId: "menus_getStats" })
  @ApiResponse({ status: 200, type: MenuStatsDto })
  getStats(@CurrentTenant() tenant: TenantContext) {
    return this.service.getStats(tenant.schemaName);
  }

  @Get(":id")
  @Roles("OWNER", "ADMIN", "MANAGER", "CASHIER")
  @ApiOperation({ summary: "Obtener producto por ID", operationId: "menus_findOne" })
  @ApiResponse({ status: 200, type: MenuResponseDto })
  @ApiResponse({ status: 404, description: "Producto no encontrado" })
  findOne(@CurrentTenant() tenant: TenantContext, @Param("id") id: string) {
    return this.service.findOne(tenant.schemaName, id);
  }

  @Post()
  @Roles("OWNER", "ADMIN")
  @ApiOperation({ summary: "Crear producto", operationId: "menus_create" })
  @ApiResponse({ status: 201, type: MenuResponseDto })
  create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateMenuDto) {
    return this.service.create(tenant.schemaName, dto);
  }

  @Put(":id")
  @Roles("OWNER", "ADMIN")
  @ApiOperation({ summary: "Actualizar producto", operationId: "menus_update" })
  @ApiResponse({ status: 200, type: MenuResponseDto })
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param("id") id: string,
    @Body() dto: UpdateMenuDto,
  ) {
    return this.service.update(tenant.schemaName, id, dto);
  }

  @Patch(":id/price")
  @Roles("OWNER", "ADMIN")
  @ApiOperation({ summary: "Actualizar precio", operationId: "menus_updatePrice" })
  @ApiResponse({ status: 200, type: MenuResponseDto })
  updatePrice(
    @CurrentTenant() tenant: TenantContext,
    @Param("id") id: string,
    @Body() dto: UpdatePriceDto,
  ) {
    return this.service.updatePrice(tenant.schemaName, id, dto);
  }

  @Patch(":id/status")
  @Roles("OWNER", "ADMIN")
  @ApiOperation({ summary: "Actualizar estado de disponibilidad", operationId: "menus_updateStatus" })
  @ApiResponse({ status: 200, type: MenuResponseDto })
  updateStatus(
    @CurrentTenant() tenant: TenantContext,
    @Param("id") id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.service.updateStatus(tenant.schemaName, id, dto);
  }

  @Delete(":id")
  @Roles("OWNER", "ADMIN")
  @ApiOperation({ summary: "Eliminar producto (soft-delete)", operationId: "menus_remove" })
  @ApiResponse({ status: 200, description: "Producto marcado como no disponible" })
  remove(@CurrentTenant() tenant: TenantContext, @Param("id") id: string) {
    return this.service.remove(tenant.schemaName, id);
  }
}
