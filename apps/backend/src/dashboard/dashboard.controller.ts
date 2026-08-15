import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
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
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { DashboardService } from './dashboard.service';
import {
  ActivityItemDto,
  ActivityQueryDto,
  BranchesSummaryQueryDto,
  BranchSummaryDto,
  DashboardStatsDto,
  RevenuePointDto,
  RevenueQueryDto,
} from './dto/dashboard.dto';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT')
@ApiSecurity('TenantSlug')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
// Envuelve la respuesta en { data, message, success, timestamp }: es el
// contrato ApiResponse<T> de @maison/types que consume el frontend.
@UseInterceptors(TransformInterceptor)
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('stats')
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Métricas generales del tenant (opcional: filtrar por branchId)', operationId: 'dashboard_getStats' })
  @ApiResponse({ status: 200, type: DashboardStatsDto })
  getStats(
    @CurrentTenant() tenant: TenantContext,
    @Query('branchId') branchId?: string,
  ): Promise<DashboardStatsDto> {
    return this.service.getStats(tenant.schemaName, branchId);
  }

  @Get('revenue')
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({
    summary: 'Ingresos mensuales (órdenes PAID) de los últimos meses (opcional: filtrar por branchId)',
    operationId: 'dashboard_getRevenue',
  })
  @ApiResponse({ status: 200, type: RevenuePointDto, isArray: true })
  getRevenue(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: RevenueQueryDto,
  ): Promise<RevenuePointDto[]> {
    const branchId = (query as any).branchId;
    return this.service.getRevenueChart(tenant.schemaName, branchId);
  }

  @Get('activity')
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Actividad reciente del tenant (opcional: filtrar por branchId)', operationId: 'dashboard_getActivity' })
  @ApiResponse({ status: 200, type: ActivityItemDto, isArray: true })
  getActivity(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ActivityQueryDto,
  ): Promise<ActivityItemDto[]> {
    const branchId = (query as any).branchId;
    return this.service.getRecentActivity(tenant.schemaName, query.limit ?? 8, branchId);
  }

  @Get('branches-summary')
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({
    summary: 'Resumen por sucursal (ingresos y pedidos del mes en curso, opcional: filtrar por branchId)',
    operationId: 'dashboard_getBranchesSummary',
  })
  @ApiResponse({ status: 200, type: BranchSummaryDto, isArray: true })
  getBranchesSummary(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: BranchesSummaryQueryDto,
  ): Promise<BranchSummaryDto[]> {
    const branchId = (query as any).branchId;
    return this.service.getBranchesSummary(
      tenant.schemaName,
      tenant.slug,
      query.limit ?? 5,
      branchId,
    );
  }
}
