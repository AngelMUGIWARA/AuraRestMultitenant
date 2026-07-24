import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ReservationsService } from '../reservations/reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationQueryDto } from './dto/reservation-query.dto';
import { UpdateReservationStatusDto } from './dto/update-reservation-status.dto';
import { ReservationResponseDto } from './dto/reservation-response.dto';
import { CurrentTenant, TenantContext } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
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
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'WAITER')
  @ApiOperation({ summary: 'Obtener estadísticas de reservaciones', operationId: 'reservations_getStats' })
  @ApiResponse({ status: 200, description: 'Estadísticas de reservaciones' })
  getStats(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: any,
    @Query('branchId') branchId?: string
  ) {
    return this.reservationsService.getStats(tenant.schemaName, branchId, user);
  }

  @Post()
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'WAITER')
  @ApiOperation({ summary: 'Crear una nueva reservación', operationId: 'reservations_create' })
  @ApiResponse({ status: 201, type: ReservationResponseDto })
  create(
    @CurrentTenant() tenant: TenantContext,
    @Body() createDto: CreateReservationDto,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.sub ?? user?.userId;
    return this.reservationsService.create(createDto, tenant.schemaName, userId, user);
  }

  @Get()
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'WAITER')
  @ApiOperation({ summary: 'Listar todas las reservaciones', operationId: 'reservations_findAll' })
  @ApiResponse({ status: 200, description: 'Lista de reservaciones' })
  findAll(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: any,
    @Query() query: ReservationQueryDto
  ) {
    return this.reservationsService.findAll(tenant.schemaName, query, user);
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'WAITER')
  @ApiOperation({ summary: 'Obtener una reservación por ID', operationId: 'reservations_findOne' })
  @ApiResponse({ status: 200, type: ReservationResponseDto })
  @ApiResponse({ status: 404, description: 'Reservación no encontrada' })
  @ApiResponse({ status: 403, description: 'Acceso denegado a esta reservación' })
  findOne(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: any,
    @Param('id') id: string
  ) {
    return this.reservationsService.findOne(id, tenant.schemaName, user);
  }

  @Patch(':id/status')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'CASHIER')
  @ApiOperation({ summary: 'Actualizar el estado de una reservación', operationId: 'reservations_updateStatus' })
  @ApiResponse({ status: 200, type: ReservationResponseDto })
  @ApiResponse({ status: 400, description: 'Transición de estado inválida' })
  @ApiResponse({ status: 403, description: 'Acceso denegado a esta reservación' })
  @ApiResponse({ status: 404, description: 'Reservación no encontrada' })
  @ApiResponse({ status: 409, description: 'Conflicto de negocio' })
  updateStatus(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() statusDto: UpdateReservationStatusDto,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.sub ?? user?.userId;
    return this.reservationsService.updateStatus(
      id,
      statusDto.status,
      tenant.schemaName,
      userId,
      user,
    );
  }
}