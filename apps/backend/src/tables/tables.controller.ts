import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant, TenantContext } from '../common/decorators/current-tenant.decorator';
import { TablesService } from './tables.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { UpdateTableStatusDto } from './dto/update-table.dto';
import { TableResponseDto } from './dto/table-response.dto';

@ApiTags('Tables')
@ApiBearerAuth('JWT')
@ApiSecurity('TenantSlug')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) { }

  @Roles('MANAGER', 'OWNER', 'CASHIER', 'WAITER')
  @Get()
  @ApiOperation({ summary: 'Listar mesas', operationId: 'tables_findAll' })
  @ApiResponse({ status: 200, type: [TableResponseDto] })
  findAll(
    @CurrentTenant() tenant: TenantContext,
    @Query('branchId') branchId?: string,
  ) {
    return this.tablesService.findAll(tenant.schemaName, branchId);
  }

  @Roles('MANAGER', 'OWNER', 'CASHIER', 'WAITER')
  @Get(':id')
  @ApiOperation({ summary: 'Obtener mesa por ID', operationId: 'tables_findById' })
  @ApiResponse({ status: 200, type: TableResponseDto })
  @ApiResponse({ status: 404, description: 'Mesa no encontrada' })
  findById(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.tablesService.findById(tenant.schemaName, id);
  }

  @Roles('MANAGER', 'OWNER', 'CASHIER', 'WAITER')
  @Patch(':id/status')
  @ApiOperation({ summary: 'Actualizar estado de mesa', operationId: 'tables_updateStatus' })
  @ApiResponse({ status: 200, type: TableResponseDto })
  @ApiResponse({ status: 404, description: 'Mesa no encontrada' })
  updateStatus(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() updateDto: UpdateTableStatusDto,
  ) {
    return this.tablesService.updateStatus(tenant.schemaName, id, updateDto.status);
  }

  @Roles('OWNER')
  @Post()
  @ApiOperation({ summary: 'Crear mesa', operationId: 'tables_create' })
  @ApiResponse({ status: 201, type: TableResponseDto })
  @ApiResponse({ status: 409, description: 'Mesa con este número ya existe en esta sucursal' })
  create(
    @CurrentTenant() tenant: TenantContext,
    @Body() createDto: CreateTableDto,
  ) {
    return this.tablesService.create(tenant.schemaName, createDto);
  }

  @Roles('OWNER')
  @Patch(':id')
  @ApiOperation({ summary: 'Editar mesa', operationId: 'tables_update' })
  @ApiResponse({ status: 200, type: TableResponseDto })
  @ApiResponse({ status: 404, description: 'Mesa no encontrada' })
  @ApiResponse({ status: 409, description: 'Número de mesa duplicado en esta sucursal' })
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() updateDto: UpdateTableDto,
  ) {
    return this.tablesService.update(tenant.schemaName, id, updateDto);
  }

  @Roles('OWNER')
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar o desactivar mesa', operationId: 'tables_delete' })
  @ApiResponse({ status: 200, description: 'Mesa eliminada o desactivada' })
  @ApiResponse({ status: 404, description: 'Mesa no encontrada' })
  delete(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.tablesService.delete(tenant.schemaName, id);
  }
}