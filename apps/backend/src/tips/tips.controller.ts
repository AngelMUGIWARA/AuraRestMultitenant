import { Controller, Put, Delete, Param, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrderTipService } from './order-tip.service';
import { UpdateTipDto } from './dto/update-tip.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../generated/prisma-tenant';
import { Request } from 'express';
import { OrdersService } from '../orders/orders.service';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('orders')
export class TipsController {
  constructor(
    private readonly orderTipService: OrderTipService,
    private readonly ordersService: OrdersService,
  ) {}

  @Put(':id/tip')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER, UserRole.WAITER)
  @ApiOperation({ summary: 'Apply or update tip for an order' })
  async applyTip(
    @Param('id') id: string,
    @Body() dto: UpdateTipDto,
    @Req() req: Request,
  ) {
    const schemaName = (req as any).tenantId;
    const userId = (req.user as any).id;
    await this.orderTipService.applyTip(schemaName, id, dto, userId);
    return this.ordersService.findById(schemaName, id);
  }

  @Delete(':id/tip')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER, UserRole.WAITER)
  @ApiOperation({ summary: 'Remove tip from an order' })
  @HttpCode(HttpStatus.OK)
  async removeTip(
    @Param('id') id: string,
    @Body('expectedVersion') expectedVersion: number,
    @Req() req: Request,
  ) {
    const schemaName = (req as any).tenantId;
    const userId = (req.user as any).id;
    const dto = new UpdateTipDto();
    dto.method = 'NONE' as any;
    dto.expectedVersion = expectedVersion;
    
    await this.orderTipService.applyTip(schemaName, id, dto, userId);
    return this.ordersService.findById(schemaName, id);
  }
}
