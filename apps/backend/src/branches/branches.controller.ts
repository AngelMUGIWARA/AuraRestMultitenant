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
import { BranchesService } from './branches.service';
import {
  BranchFiltersDto,
  BranchResponseDto,
  BranchStatsResponseDto,
  CreateBranchDto,
  UpdateBranchDto,
} from './dto/branch.dto';

@ApiTags('Branches')
@ApiBearerAuth('JWT')
@ApiSecurity('TenantSlug')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('admin/branches')
export class BranchesController {
  constructor(private readonly service: BranchesService) {}

  @Get('stats')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Estadísticas de sucursales', operationId: 'branches_getStats' })
  @ApiResponse({ status: 200, type: BranchStatsResponseDto })
  getStats(@CurrentTenant() tenant: TenantContext) {
    return this.service.getStats(tenant.schemaName);
  }

  @Get()
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Listar sucursales', operationId: 'branches_getAll' })
  @ApiResponse({ status: 200, type: BranchResponseDto, isArray: true })
  getAll(
    @CurrentTenant() tenant: TenantContext,
    @Query() filters: BranchFiltersDto,
  ) {
    return this.service.getAll(tenant.schemaName, {});
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Obtener sucursal por ID', operationId: 'branches_getOne' })
  @ApiResponse({ status: 200, type: BranchResponseDto })
  @ApiResponse({ status: 404, description: 'Sucursal no encontrada' })
  getOne(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.service.getOne(tenant.schemaName, id);
  }

  @Post()
  @Roles('OWNER', 'ADMIN')
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
  @Roles('OWNER', 'ADMIN')
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
  @Roles('OWNER', 'ADMIN')
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
  @Roles('OWNER', 'ADMIN')
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

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Eliminar sucursal', operationId: 'branches_remove' })
  @ApiResponse({ status: 200, description: 'Sucursal eliminada' })
  @ApiResponse({ status: 404, description: 'Sucursal no encontrada' })
  remove(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.service.remove(tenant.schemaName, id);
  }
}
