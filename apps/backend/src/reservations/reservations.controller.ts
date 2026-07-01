import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ReservationsService } from '../reservations/reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationQueryDto } from './dto/reservation-query.dto';
import { UpdateReservationStatusDto } from './dto/update-reservation-status.dto';
import { CurrentTenant, TenantContext } from '../common/decorators/current-tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard'; // Asegúrate de proteger el controlador

@Controller('admin/reservations')
@UseGuards(TenantGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  // 1. LAS RUTAS FIJAS O ESTÁTICAS SIEMPRE VAN HASTA ARRIBA
  @Get('stats')
  getStats(
    @CurrentTenant() tenant: TenantContext,
    @Query('branchId') branchId?: string
  ) {
    return this.reservationsService.getStats(tenant.schemaName, branchId);
  }

  // 2. ENTRADAS DE ESCRITURA
  @Post()
  create(
    @CurrentTenant() tenant: TenantContext,
    @Body() createDto: CreateReservationDto
  ) {
    return this.reservationsService.create(createDto, tenant.schemaName);
  }

  // 3. LISTADOS GLOBALES
  @Get()
  findAll(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ReservationQueryDto
  ) {
    return this.reservationsService.findAll(tenant.schemaName, query);
  }

  // 4. PARAMETRIZADOS DINÁMICOS AL FINAL (:id)
  @Get(':id')
  findOne(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string
  ) {
    return this.reservationsService.findOne(id, tenant.schemaName);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string, 
    @Body() statusDto: UpdateReservationStatusDto
  ) {
    return this.reservationsService.updateStatus(id, statusDto.status, tenant.schemaName);
  }
}