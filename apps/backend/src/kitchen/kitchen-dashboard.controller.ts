import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant, TenantContext } from '../common/decorators/current-tenant.decorator';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { DashboardService } from '../dashboard/dashboard.service';
import { DashboardStatsDto } from '../dashboard/dto/dashboard.dto';

@ApiTags('Kitchen Dashboard')
@ApiBearerAuth('JWT')
@ApiSecurity('TenantSlug')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles('KITCHEN_STAFF')
@UseInterceptors(TransformInterceptor)
@Controller('kitchen/dashboard')
export class KitchenDashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Stats for kitchen staff (same shape as admin stats)',
    operationId: 'kitchen_dashboard_getStats',
  })
  @ApiResponse({ status: 200, type: DashboardStatsDto })
  getStats(
    @CurrentTenant() tenant: TenantContext,
    @Query('branchId') branchId?: string,
  ): Promise<DashboardStatsDto> {
    return this.service.getStats(tenant.schemaName, branchId);
  }

  // You can add additional kitchen‑specific endpoints here (e.g. revenue, activity)
}
