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
} from "@nestjs/common";

import {
  ApiBearerAuth,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiQuery,
} from "@nestjs/swagger";

import { MenusService } from "./menus.service";

import { CreateMenuDto } from "./dto/create-menu.dto";
import { UpdateMenuDto } from "./dto/update-menu.dto";
import { UpdatePriceDto } from "./dto/update-price.dto";
import { UpdateStatusDto } from "./dto/update-status.dto";

import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { TenantGuard } from "../common/guards/tenant.guard";

import { Roles } from "../common/decorators/roles.decorator";

import {
  CurrentTenant,
  TenantContext,
} from "../common/decorators/current-tenant.decorator";

@ApiTags("Menus")
@ApiBearerAuth("JWT")
@ApiSecurity("TenantSlug")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller("admin/menus")
export class MenusController {
  constructor(private readonly service: MenusService) {}

  @Get()
  @ApiQuery({
    name: "categoryId",
    required: false,
    type: String,
    description: "Filtrar productos por categoría",
  })
  @Roles("OWNER", "ADMIN", "MANAGER")
  @ApiOperation({ summary: "Listar menú" })
  findAll(
    @CurrentTenant() tenant: TenantContext,
    @Query("categoryId") categoryId?: string,
  ) {
    return this.service.findAll(tenant.schemaName, categoryId);
  }

  @Get("stats")
  @Roles("OWNER", "ADMIN", "MANAGER")
  @ApiOperation({ summary: "Estadísticas del menú" })
  getStats(@CurrentTenant() tenant: TenantContext) {
    return this.service.getStats(tenant.schemaName);
  }

  @Get(":id")
  @Roles("OWNER", "ADMIN", "MANAGER")
  @ApiOperation({ summary: "Obtener producto" })
  findOne(@CurrentTenant() tenant: TenantContext, @Param("id") id: string) {
    return this.service.findOne(tenant.schemaName, id);
  }

  @Post()
  @Roles("OWNER", "ADMIN")
  @ApiOperation({ summary: "Crear producto" })
  create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateMenuDto) {
    return this.service.create(tenant.schemaName, dto);
  }

  @Put(":id")
  @Roles("OWNER", "ADMIN")
  @ApiOperation({ summary: "Actualizar producto" })
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param("id") id: string,
    @Body() dto: UpdateMenuDto,
  ) {
    return this.service.update(tenant.schemaName, id, dto);
  }

  @Patch(":id/price")
  @Roles("OWNER", "ADMIN")
  @ApiOperation({ summary: "Actualizar precio" })
  updatePrice(
    @CurrentTenant() tenant: TenantContext,
    @Param("id") id: string,
    @Body() dto: UpdatePriceDto,
  ) {
    return this.service.updatePrice(tenant.schemaName, id, dto);
  }

  @Patch(":id/status")
  @Roles("OWNER", "ADMIN")
  @ApiOperation({ summary: "Actualizar estado" })
  updateStatus(
    @CurrentTenant() tenant: TenantContext,
    @Param("id") id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.service.updateStatus(tenant.schemaName, id, dto);
  }

  @Delete(":id")
  @Roles("OWNER", "ADMIN")
  @ApiOperation({ summary: "Eliminar producto" })
  remove(@CurrentTenant() tenant: TenantContext, @Param("id") id: string) {
    return this.service.remove(tenant.schemaName, id);
  }
}
