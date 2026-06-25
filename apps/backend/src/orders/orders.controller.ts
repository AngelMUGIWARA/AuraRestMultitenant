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
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';

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
  findAll(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: OrderQueryDto,
  ) {
    return this.ordersService.findAll(tenant.schemaName, query);
  }

  @Public()
  @Get('stats')
  getStats(@CurrentTenant() tenant: TenantContext) {
    return this.ordersService.getStats(tenant.schemaName);
  }

  @Public()
  @Get(':id')
  findById(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.ordersService.findById(tenant.schemaName, id);
  }

  @Roles('ADMIN', 'MANAGER', 'OWNER', 'CASHIER', 'WAITER')
  @Patch(':id/status')
  updateStatus(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(tenant.schemaName, id, dto);
  }

  @Roles('ADMIN', 'MANAGER', 'OWNER', 'CASHIER', 'WAITER')
  @Post(':id/cancel')
  cancel(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancel(tenant.schemaName, id, dto?.reason);
  }
}