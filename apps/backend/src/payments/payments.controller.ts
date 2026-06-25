import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant, TenantContext } from '../common/decorators/current-tenant.decorator';
import { PaymentsService } from './payments.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';

@ApiTags('Payments')
@ApiBearerAuth('JWT')
@ApiSecurity('TenantSlug')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Roles('ADMIN', 'MANAGER', 'OWNER', 'CASHIER')
  @Post('process')
  processPayment(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: ProcessPaymentDto,
  ) {
    return this.paymentsService.processPayment(tenant.schemaName, dto);
  }

  @Roles('ADMIN', 'MANAGER', 'OWNER', 'CASHIER')
  @Get('order/:orderId')
  findByOrder(
    @CurrentTenant() tenant: TenantContext,
    @Param('orderId') orderId: string,
  ) {
    return this.paymentsService.findByOrder(tenant.schemaName, orderId);
  }
}
