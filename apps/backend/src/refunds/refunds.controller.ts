import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../generated/prisma-tenant';

@Controller()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post('orders/:orderId/payments/:paymentId/refunds')
  @Roles(UserRole.MANAGER, UserRole.CASHIER, UserRole.OWNER)
  async createRefund(
    @CurrentTenant() schemaName: string,
    @Param('orderId') orderId: string,
    @Param('paymentId') paymentId: string,
    @Body() dto: CreateRefundDto,
    @CurrentUser() user: any,
  ) {
    return this.refundsService.createRefund(schemaName, orderId, paymentId, dto, user?.id);
  }
}
