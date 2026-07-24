import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentTenant,
  TenantContext,
} from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CashRegisterService } from './cash-register.service';
import { CreateCashRegisterDto } from './dto/create-cash-register.dto';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { CreateCashCountDto } from './dto/create-cash-count.dto';
import { ListCashSessionsQueryDto } from './dto/list-cash-sessions-query.dto';

@ApiTags('Cash Register')
@ApiBearerAuth('JWT')
@ApiSecurity('TenantSlug')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('cash')
export class CashRegisterController {
  constructor(private readonly cashRegisterService: CashRegisterService) {}

  @Roles('OWNER', 'ADMIN')
  @Post('registers')
  @ApiOperation({
    summary: 'Crear una caja para una sucursal',
    operationId: 'cash_createRegister',
  })
  @ApiResponse({ status: 201, description: 'Caja creada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'Ya existe una caja con ese nombre' })
  createRegister(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateCashRegisterDto,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.sub ?? user?.userId;
    if (!userId) throw new UnauthorizedException('Usuario no autenticado.');
    return this.cashRegisterService.createRegister(tenant.schemaName, dto, userId);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'CASHIER')
  @Get('registers')
  @ApiOperation({
    summary: 'Listar cajas',
    operationId: 'cash_findRegisters',
  })
  @ApiResponse({ status: 200, description: 'Lista de cajas' })
  findRegisters(
    @CurrentTenant() tenant: TenantContext,
    @Query('branchId') branchId?: string,
  ) {
    return this.cashRegisterService.findRegisters(tenant.schemaName, branchId);
  }

  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  @Post('sessions/open')
  @ApiOperation({
    summary: 'Abrir una sesión de caja',
    operationId: 'cash_openSession',
  })
  @ApiResponse({ status: 201, description: 'Sesión abierta' })
  @ApiResponse({ status: 400, description: 'Caja inactiva o datos inválidos' })
  @ApiResponse({ status: 409, description: 'Ya existe una sesión abierta para esta caja' })
  openSession(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: OpenCashSessionDto,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.sub ?? user?.userId;
    if (!userId) throw new UnauthorizedException('Usuario no autenticado.');
    return this.cashRegisterService.openSession(tenant.schemaName, dto, userId);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'CASHIER')
  @Get('sessions/current')
  @ApiOperation({
    summary: 'Obtener la sesión de caja actual (abierta)',
    operationId: 'cash_findCurrentSession',
  })
  @ApiResponse({ status: 200, description: 'Sesión actual' })
  findCurrentSession(
    @CurrentTenant() tenant: TenantContext,
    @Query('branchId') branchId?: string,
  ) {
    return this.cashRegisterService.findCurrentSession(tenant.schemaName, branchId);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'CASHIER')
  @Get('sessions')
  @ApiOperation({
    summary: 'Listar sesiones de caja con filtros',
    operationId: 'cash_findSessions',
  })
  @ApiResponse({ status: 200, description: 'Lista paginada de sesiones' })
  findSessions(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ListCashSessionsQueryDto,
  ) {
    return this.cashRegisterService.findSessions(tenant.schemaName, query);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'CASHIER')
  @Get('sessions/:id')
  @ApiOperation({
    summary: 'Obtener una sesión de caja por ID',
    operationId: 'cash_findSessionById',
  })
  @ApiParam({ name: 'id', description: 'ID de la sesión' })
  @ApiResponse({ status: 200, description: 'Sesión encontrada' })
  @ApiResponse({ status: 404, description: 'Sesión no encontrada' })
  findSessionById(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.cashRegisterService.findSessionById(tenant.schemaName, id);
  }

  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  @Post('sessions/:id/movements')
  @ApiOperation({
    summary: 'Registrar un movimiento manual (ingreso/egreso/ajuste)',
    operationId: 'cash_createMovement',
  })
  @ApiParam({ name: 'id', description: 'ID de la sesión' })
  @ApiResponse({ status: 201, description: 'Movimiento registrado' })
  @ApiResponse({ status: 400, description: 'Sesión cerrada o datos inválidos' })
  @ApiResponse({ status: 409, description: 'Conflicto de concurrencia' })
  createMovement(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: CreateCashMovementDto,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.sub ?? user?.userId;
    if (!userId) throw new UnauthorizedException('Usuario no autenticado.');
    return this.cashRegisterService.createMovement(tenant.schemaName, id, dto, userId);
  }

  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  @Post('sessions/:id/count')
  @ApiOperation({
    summary: 'Registrar arqueo de caja',
    operationId: 'cash_createCount',
  })
  @ApiParam({ name: 'id', description: 'ID de la sesión' })
  @ApiResponse({ status: 201, description: 'Arqueo registrado' })
  @ApiResponse({ status: 400, description: 'Sesión cerrada' })
  @ApiResponse({ status: 409, description: 'Conflicto de concurrencia' })
  createCount(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: CreateCashCountDto,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.sub ?? user?.userId;
    if (!userId) throw new UnauthorizedException('Usuario no autenticado.');
    return this.cashRegisterService.createCount(tenant.schemaName, id, dto, userId);
  }

  @Roles('ADMIN', 'MANAGER')
  @Post('sessions/:id/close')
  @ApiOperation({
    summary: 'Cerrar sesión de caja',
    operationId: 'cash_closeSession',
  })
  @ApiParam({ name: 'id', description: 'ID de la sesión' })
  @ApiResponse({ status: 200, description: 'Sesión cerrada' })
  @ApiResponse({ status: 400, description: 'Sesión ya cerrada' })
  @ApiResponse({ status: 409, description: 'Conflicto de concurrencia' })
  closeSession(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: CloseCashSessionDto,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.sub ?? user?.userId;
    if (!userId) throw new UnauthorizedException('Usuario no autenticado.');
    return this.cashRegisterService.closeSession(tenant.schemaName, id, dto, userId);
  }
}
