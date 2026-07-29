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
import { ProductsReportResponseDto } from './dto/products-report-response.dto';
import { PaymentsReportResponseDto } from './dto/payments-report-response.dto';
import { PeakHoursReportResponseDto } from './dto/peak-hours-report-response.dto';
import { Res } from '@nestjs/common';
import type { Response } from 'express';
import { ExportReportQueryDto } from './dto/export-report-query.dto';

@ApiTags('Reports')
@ApiBearerAuth('JWT')
@ApiSecurity('TenantSlug')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('admin/reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('sales')
  @Roles('OWNER', 'MANAGER')
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

  @Get('products')
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Productos más vendidos por período' })
  @ApiResponse({ status: 200, type: ProductsReportResponseDto })
  getProductsReport(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: SalesReportQueryDto,
  ): Promise<ProductsReportResponseDto> {
    return this.service.getProductsReport(tenant.schemaName, query);
  }

  @Get('payments')
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Reporte de métodos de pago por período' })
  @ApiResponse({ status: 200, type: PaymentsReportResponseDto })
  getPaymentsReport(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: SalesReportQueryDto,
  ): Promise<PaymentsReportResponseDto> {
    return this.service.getPaymentsReport(tenant.schemaName, query);
  }

  @Get('peak-hours')
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Horarios de mayor actividad por período' })
  @ApiResponse({ status: 200, type: PeakHoursReportResponseDto })
  getPeakHoursReport(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: SalesReportQueryDto,
  ): Promise<PeakHoursReportResponseDto> {
    return this.service.getPeakHoursReport(tenant.schemaName, query);
  }

  @Get('export')
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Exportar reporte como CSV' })
  @ApiResponse({ status: 200, type: 'Archivo CSV' })
  async exportReport(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ExportReportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const { csv, filename } = await this.service.exportReport(
      tenant.schemaName,
      query,
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
