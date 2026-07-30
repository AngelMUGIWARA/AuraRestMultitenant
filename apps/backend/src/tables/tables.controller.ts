import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
}