import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";

import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";

import { CategoriesService } from "./categories.service";

import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";

import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { TenantGuard } from "../common/guards/tenant.guard";

import { Roles } from "../common/decorators/roles.decorator";

import {
  CurrentTenant,
  TenantContext,
} from "../common/decorators/current-tenant.decorator";

import { CategoryResponseDto } from "./dto/category-response.dto";
import { CategoryStatsDto } from "./dto/category-stats.dto";

@ApiTags("Categories")
@ApiBearerAuth("JWT")
@ApiSecurity("TenantSlug")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller("admin/categories")
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get()
  @Roles("OWNER", "ADMIN", "MANAGER")
  @ApiOperation({ summary: "Listar categorías", operationId: "categories_findAll" })
  @ApiResponse({ status: 200, type: [CategoryResponseDto] })
  findAll(@CurrentTenant() tenant: TenantContext) {
    return this.service.findAll(tenant.schemaName);
  }

  @Get("stats")
  @Roles("OWNER", "ADMIN", "MANAGER")
  @ApiOperation({ summary: "Estadísticas de categorías", operationId: "categories_getStats" })
  @ApiResponse({ status: 200, type: CategoryStatsDto })
  getStats(@CurrentTenant() tenant: TenantContext) {
    return this.service.getStats(tenant.schemaName);
  }

  @Get(":id")
  @Roles("OWNER", "ADMIN", "MANAGER")
  @ApiOperation({ summary: "Obtener categoría por ID", operationId: "categories_findOne" })
  @ApiResponse({ status: 200, type: CategoryResponseDto })
  @ApiResponse({ status: 404, description: "Categoría no encontrada" })
  findOne(@CurrentTenant() tenant: TenantContext, @Param("id") id: string) {
    return this.service.findOne(tenant.schemaName, id);
  }

  @Post()
  @Roles("OWNER", "ADMIN")
  @ApiOperation({ summary: "Crear categoría", operationId: "categories_create" })
  @ApiResponse({ status: 201, type: CategoryResponseDto })
  create(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.service.create(tenant.schemaName, dto);
  }

  @Put(":id")
  @Roles("OWNER", "ADMIN")
  @ApiOperation({ summary: "Actualizar categoría", operationId: "categories_update" })
  @ApiResponse({ status: 200, type: CategoryResponseDto })
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param("id") id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.service.update(tenant.schemaName, id, dto);
  }

  @Delete(":id")
  @Roles("OWNER", "ADMIN")
  @ApiOperation({ summary: "Eliminar categoría", operationId: "categories_remove" })
  @ApiResponse({ status: 200, description: "Categoría eliminada" })
  remove(@CurrentTenant() tenant: TenantContext, @Param("id") id: string) {
    return this.service.remove(tenant.schemaName, id);
  }
}
