import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant, TenantContext } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';

@ApiTags('Payments')
@ApiBearerAuth('JWT')
@ApiSecurity('TenantSlug')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Roles('MANAGER', 'OWNER', 'CASHIER')
  @Post('process')
  @ApiOperation({ summary: 'Procesar pago de una orden', operationId: 'payments_processPayment' })
  @ApiResponse({ status: 201, type: PaymentResponseDto })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  processPayment(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: ProcessPaymentDto,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.sub ?? user?.userId;
    return this.paymentsService.processPayment(tenant.schemaName, dto, userId);
  }

  @Roles('MANAGER', 'OWNER', 'CASHIER')
  @Get('order/:orderId')
  @ApiOperation({ summary: 'Obtener pagos de una orden', operationId: 'payments_findByOrder' })
  @ApiResponse({ status: 200, type: [PaymentResponseDto] })
  findByOrder(
    @CurrentTenant() tenant: TenantContext,
    @Param('orderId') orderId: string,
  ) {
    return this.paymentsService.findByOrder(tenant.schemaName, orderId);
  }
}
