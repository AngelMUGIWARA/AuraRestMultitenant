import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { SalesReportQueryDto } from './dto/sales-report-query.dto';
import { SalesReportResponseDto } from './dto/sales-report-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentTenant,
  TenantContext,
} from '../common/decorators/current-tenant.decorator';

@ApiTags('Reports')
@ApiBearerAuth('JWT')
@ApiSecurity('TenantSlug')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('admin/reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('sales')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Reporte de ventas por período' })
  @ApiResponse({ status: 200, type: SalesReportResponseDto })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permisos suficientes' })
  getSalesReport(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: SalesReportQueryDto,
  ): Promise<SalesReportResponseDto> {
    return this.service.getSalesReport(tenant.schemaName, query);
  }
}
