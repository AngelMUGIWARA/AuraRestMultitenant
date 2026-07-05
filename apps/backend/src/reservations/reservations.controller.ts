import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ReservationsService } from '../reservations/reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationQueryDto } from './dto/reservation-query.dto';
import { UpdateReservationStatusDto } from './dto/update-reservation-status.dto';
import { CurrentTenant, TenantContext } from '../common/decorators/current-tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Reservations')
@ApiBearerAuth('JWT')
@ApiSecurity('TenantSlug')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('admin/reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get('stats')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'CASHIER')
  @ApiOperation({ summary: 'Obtener estadísticas de reservaciones' })
  getStats(
    @CurrentTenant() tenant: TenantContext,
    @Query('branchId') branchId?: string
  ) {
    return this.reservationsService.getStats(tenant.schemaName, branchId);
  }

  @Post()
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'WAITER')
  @ApiOperation({ summary: 'Crear una nueva reservación' })
  create(
    @CurrentTenant() tenant: TenantContext,
    @Body() createDto: CreateReservationDto
  ) {
    return this.reservationsService.create(createDto, tenant.schemaName);
  }

  @Get()
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'WAITER')
  @ApiOperation({ summary: 'Listar todas las reservaciones' })
  findAll(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ReservationQueryDto
  ) {
    return this.reservationsService.findAll(tenant.schemaName, query);
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'WAITER')
  @ApiOperation({ summary: 'Obtener una reservación por ID' })
  findOne(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string
  ) {
    return this.reservationsService.findOne(id, tenant.schemaName);
  }

  @Patch(':id/status')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'CASHIER')
  @ApiOperation({ summary: 'Actualizar el estado de una reservación' })
  updateStatus(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string, 
    @Body() statusDto: UpdateReservationStatusDto
  ) {
    return this.reservationsService.updateStatus(id, statusDto.status, tenant.schemaName);
  }
}