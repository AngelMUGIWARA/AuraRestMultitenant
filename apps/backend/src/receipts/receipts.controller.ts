import {
  Body,
  Controller,
  Get,
  Param,
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
import { ReceiptsService } from './receipts.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { ListReceiptsQueryDto } from './dto/list-receipts-query.dto';
import {
  PaginatedReceiptsDto,
  ReceiptResponseDto,
} from './dto/receipt-response.dto';

@ApiTags('Receipts')
@ApiBearerAuth('JWT')
@ApiSecurity('TenantSlug')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Roles('ADMIN', 'OWNER', 'CASHIER')
  @Post()
  @ApiOperation({
    summary: 'Emitir un comprobante interno para una orden liquidada',
    operationId: 'receipts_create',
  })
  @ApiResponse({
    status: 201,
    description: 'Comprobante emitido exitosamente',
    type: ReceiptResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Orden no liquidada o no existe' })
  @ApiResponse({
    status: 409,
    description: 'Conflicto de idempotencia con orden diferente',
  })
  create(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateReceiptDto,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.sub ?? user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Usuario no autenticado.');
    }
    return this.receiptsService.create(
      tenant.schemaName,
      dto,
      userId,
      tenant.name,
    );
  }

  @Roles('ADMIN', 'OWNER', 'CASHIER', 'MANAGER')
  @Get()
  @ApiOperation({
    summary: 'Listar comprobantes con paginación y filtros',
    operationId: 'receipts_findAll',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de comprobantes',
    type: PaginatedReceiptsDto,
  })
  findAll(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ListReceiptsQueryDto,
  ) {
    return this.receiptsService.findAll(tenant.schemaName, query);
  }

  @Roles('ADMIN', 'OWNER', 'CASHIER', 'MANAGER')
  @Get('order/:orderId')
  @ApiOperation({
    summary: 'Obtener el comprobante de una orden',
    operationId: 'receipts_findByOrder',
  })
  @ApiParam({ name: 'orderId', description: 'ID de la orden' })
  @ApiResponse({
    status: 200,
    description: 'Comprobante de la orden',
    type: ReceiptResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'No existe comprobante para esta orden',
  })
  findByOrder(
    @CurrentTenant() tenant: TenantContext,
    @Param('orderId') orderId: string,
  ) {
    return this.receiptsService.findByOrder(tenant.schemaName, orderId);
  }

  @Roles('ADMIN', 'OWNER', 'CASHIER', 'MANAGER')
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un comprobante por ID',
    operationId: 'receipts_findById',
  })
  @ApiParam({ name: 'id', description: 'ID del comprobante' })
  @ApiResponse({
    status: 200,
    description: 'Comprobante encontrado',
    type: ReceiptResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Comprobante no encontrado' })
  findById(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.receiptsService.findById(tenant.schemaName, id);
  }
}
