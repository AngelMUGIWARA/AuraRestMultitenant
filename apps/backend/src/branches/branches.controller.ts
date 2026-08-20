import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentTenant,
  TenantContext,
} from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { BranchesService } from './branches.service';
import { TablesService } from '../tables/tables.service';
import { CreateTableDto } from '../tables/dto/create-table.dto';
import { UpdateTableDto } from '../tables/dto/update-table.dto';
import {
  BranchFiltersDto,
  BranchResponseDto,
  BranchStatsResponseDto,
  CreateBranchDto,
  PaginatedBranchesDto,
  UpdateBranchDto,
} from './dto/branch.dto';

@ApiTags('Branches')
@ApiBearerAuth('JWT')
@ApiSecurity('TenantSlug')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
// Envuelve la respuesta en { data, message, success, timestamp }: es el
// contrato ApiResponse<T> de @maison/types que consume el frontend.
@UseInterceptors(TransformInterceptor)
@Controller('admin/branches')
export class BranchesController {
  constructor(
    private readonly service: BranchesService,
    private readonly tablesService: TablesService,
  ) {}

  @Get('stats')
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Estadísticas de sucursales', operationId: 'branches_getStats' })
  @ApiResponse({ status: 200, type: BranchStatsResponseDto })
  getStats(@CurrentTenant() tenant: TenantContext) {
    return this.service.getStats(tenant.schemaName);
  }

  @Get()
  @Roles('OWNER', 'MANAGER', 'WAITER', 'CASHIER')
  @ApiOperation({ summary: 'Listar sucursales', operationId: 'branches_getAll' })
  @ApiResponse({ status: 200, type: PaginatedBranchesDto })
  getAll(
    @CurrentTenant() tenant: TenantContext,
    @Query() filters: BranchFiltersDto,
  ) {
    return this.service.getAll(tenant.schemaName, filters);
  }

  @Get(':id')
  @Roles('OWNER', 'MANAGER', 'WAITER', 'CASHIER')
  @ApiOperation({ summary: 'Obtener sucursal por ID', operationId: 'branches_getOne' })
  @ApiResponse({ status: 200, type: BranchResponseDto })
  @ApiResponse({ status: 404, description: 'Sucursal no encontrada' })
  getOne(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.service.getOne(tenant.schemaName, id);
  }

  @Post()
  @Roles('OWNER')
  @ApiOperation({ summary: 'Crear sucursal', operationId: 'branches_create' })
  @ApiResponse({ status: 201, type: BranchResponseDto })
  create(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateBranchDto,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.sub ?? user?.userId;
    return this.service.create(tenant.schemaName, dto, userId);
  }

  @Put(':id')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Actualizar sucursal', operationId: 'branches_update' })
  @ApiResponse({ status: 200, type: BranchResponseDto })
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.service.update(tenant.schemaName, id, dto);
  }

  @Patch(':id/activate')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Activar sucursal', operationId: 'branches_activate' })
  @ApiResponse({ status: 200, type: BranchResponseDto })
  @ApiResponse({ status: 404, description: 'Sucursal no encontrada' })
  activate(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.sub ?? user?.userId;
    return this.service.activate(tenant.schemaName, id, userId);
  }

  @Patch(':id/deactivate')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Desactivar sucursal', operationId: 'branches_deactivate' })
  @ApiResponse({ status: 200, type: BranchResponseDto })
  @ApiResponse({ status: 404, description: 'Sucursal no encontrada' })
  deactivate(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.sub ?? user?.userId;
    return this.service.deactivate(tenant.schemaName, id, userId);
  }

  // ── Tables (nested under branch) ──────────────────────────────────

  @Get(':branchId/tables')
  @Roles('OWNER', 'MANAGER', 'WAITER')
  @ApiOperation({ summary: 'Listar mesas de sucursal', operationId: 'branch_tables_getAll' })
  @ApiResponse({ status: 200, description: 'Mesas de la sucursal' })
  getTables(@CurrentTenant() tenant: TenantContext, @Param('branchId') branchId: string) {
    return this.tablesService.findAll(tenant.schemaName, branchId);
  }

  @Post(':branchId/tables')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Crear mesa', operationId: 'branch_tables_create' })
  @ApiResponse({ status: 201, description: 'Mesa creada' })
  createTable(
    @CurrentTenant() tenant: TenantContext,
    @Param('branchId') branchId: string,
    @Body() dto: CreateTableDto,
  ) {
    return this.tablesService.create(tenant.schemaName, { ...dto, branchId });
  }

  @Patch(':branchId/tables/:tableId')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Editar mesa', operationId: 'branch_tables_update' })
  @ApiResponse({ status: 200, description: 'Mesa actualizada' })
  updateTable(
    @CurrentTenant() tenant: TenantContext,
    @Param('tableId') tableId: string,
    @Body() dto: UpdateTableDto,
  ) {
    return this.tablesService.update(tenant.schemaName, tableId, dto);
  }

  @Delete(':branchId/tables/:tableId')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Eliminar mesa', operationId: 'branch_tables_delete' })
  @ApiResponse({ status: 200, description: 'Mesa eliminada' })
  deleteTable(
    @CurrentTenant() tenant: TenantContext,
    @Param('tableId') tableId: string,
  ) {
    return this.tablesService.delete(tenant.schemaName, tableId);
  }

  @Delete(':id')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Eliminar sucursal', operationId: 'branches_remove' })
  @ApiResponse({ status: 200, description: 'Sucursal eliminada' })
  @ApiResponse({ status: 404, description: 'Sucursal no encontrada' })
  remove(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.service.remove(tenant.schemaName, id);
  }
}
