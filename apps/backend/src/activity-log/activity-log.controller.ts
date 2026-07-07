import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ActivityLogService } from './activity-log.service';
import { ActivityLogQueryDto } from './dto/activity-log-query.dto';
import { PaginatedActivityLogResponseDto } from './dto/activity-log-response.dto';
import { CurrentTenant, TenantContext } from '../common/decorators/current-tenant.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';

@ApiTags('Activity Logs')
@ApiBearerAuth('JWT')
@ApiSecurity('TenantSlug')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('admin/activity-logs')
export class ActivityLogController {
  constructor(private readonly service: ActivityLogService) {}

  @Get()
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Listar logs de actividad', operationId: 'activityLogs_findAll' })
  @ApiResponse({ status: 200, type: PaginatedActivityLogResponseDto })
  findAll(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ActivityLogQueryDto,
  ) {
    return this.service.findAll(tenant.schemaName, query);
  }
}
