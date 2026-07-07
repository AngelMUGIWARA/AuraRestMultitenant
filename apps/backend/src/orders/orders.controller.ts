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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';

import { Public } from '../common/decorators/public.decorator';
import {
  CurrentTenant,
  TenantContext,
} from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';

import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderResponseDto, OrderStatsResponseDto, PaginatedOrdersDto } from './dto/order-response.dto';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@ApiBearerAuth('JWT')
@ApiSecurity('TenantSlug')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Roles('ADMIN', 'MANAGER', 'OWNER', 'CASHIER', 'WAITER')
  @Post()
  @ApiOperation({ summary: 'Crear una orden', operationId: 'orders_create' })
  @ApiResponse({ status: 201, type: OrderResponseDto })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async create(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.sub ?? user?.userId;

    if (!userId) {
      throw new UnauthorizedException('Usuario no autenticado.');
    }

    return this.ordersService.create(tenant.schemaName, createOrderDto, userId);
  }

  @Roles('ADMIN', 'MANAGER', 'OWNER')
  @Get()
  @ApiOperation({ summary: 'Listar órdenes con filtros', operationId: 'orders_findAll' })
  @ApiResponse({ status: 200, type: PaginatedOrdersDto })
  findAll(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: OrderQueryDto,
  ) {
    return this.ordersService.findAll(tenant.schemaName, query);
  }

  @Roles('ADMIN', 'MANAGER', 'OWNER', 'CASHIER')
  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de órdenes del día', operationId: 'orders_getStats' })
  @ApiResponse({ status: 200, type: OrderStatsResponseDto })
  getStats(@CurrentTenant() tenant: TenantContext) {
    return this.ordersService.getStats(tenant.schemaName);
  }

  @Roles('ADMIN', 'MANAGER', 'OWNER', 'CASHIER', 'WAITER')
  @Get(':id')
  @ApiOperation({ summary: 'Obtener orden por ID', operationId: 'orders_findById' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  findById(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.ordersService.findById(tenant.schemaName, id);
  }

  @Roles('ADMIN', 'MANAGER', 'OWNER', 'CASHIER', 'WAITER')
  @Patch(':id/status')
  @ApiOperation({ summary: 'Actualizar estado de orden', operationId: 'orders_updateStatus' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  updateStatus(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.sub ?? user?.userId;
    return this.ordersService.updateStatus(tenant.schemaName, id, dto, userId);
  }

  @Roles('ADMIN', 'MANAGER', 'OWNER', 'CASHIER', 'WAITER')
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancelar orden', operationId: 'orders_cancel' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  cancel(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.sub ?? user?.userId;
    return this.ordersService.cancel(tenant.schemaName, id, dto?.reason, userId);
  }
}