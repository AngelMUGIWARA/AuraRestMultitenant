import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant, TenantContext } from '../common/decorators/current-tenant.decorator';
import { DiscountsService } from './discounts.service';
import { CreateDiscountDto, DiscountResponseDto } from './dto/create-discount.dto';

@ApiTags('Discounts')
@ApiBearerAuth('JWT')
@ApiSecurity('TenantSlug')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Roles('ADMIN', 'MANAGER', 'OWNER')
  @Post()
  @ApiOperation({ summary: 'Crear descuento', operationId: 'discounts_create' })
  @ApiResponse({ status: 201, type: DiscountResponseDto })
  create(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateDiscountDto,
  ) {
    return this.discountsService.create(tenant.schemaName, dto);
  }

  @Roles('ADMIN', 'MANAGER', 'OWNER')
  @Get()
  @ApiOperation({ summary: 'Listar descuentos', operationId: 'discounts_findAll' })
  @ApiResponse({ status: 200, type: [DiscountResponseDto] })
  findAll(@CurrentTenant() tenant: TenantContext) {
    return this.discountsService.findAll(tenant.schemaName);
  }

  @Roles('ADMIN', 'MANAGER', 'OWNER', 'CASHIER')
  @Get('code/:code')
  @ApiOperation({ summary: 'Buscar descuento por código', operationId: 'discounts_findByCode' })
  @ApiResponse({ status: 200, type: DiscountResponseDto })
  @ApiResponse({ status: 404, description: 'Descuento no encontrado' })
  findByCode(
    @CurrentTenant() tenant: TenantContext,
    @Param('code') code: string,
  ) {
    return this.discountsService.findByCode(tenant.schemaName, code);
  }

  @Roles('ADMIN', 'MANAGER', 'OWNER')
  @Get(':id')
  @ApiOperation({ summary: 'Obtener descuento por ID', operationId: 'discounts_findById' })
  @ApiResponse({ status: 200, type: DiscountResponseDto })
  @ApiResponse({ status: 404, description: 'Descuento no encontrado' })
  findById(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.discountsService.findById(tenant.schemaName, id);
  }

  @Roles('ADMIN', 'MANAGER', 'OWNER')
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar descuento', operationId: 'discounts_update' })
  @ApiResponse({ status: 200, type: DiscountResponseDto })
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: Partial<CreateDiscountDto>,
  ) {
    return this.discountsService.update(tenant.schemaName, id, dto);
  }

  @Roles('ADMIN', 'MANAGER', 'OWNER')
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar descuento', operationId: 'discounts_delete' })
  @ApiResponse({ status: 200, description: 'Descuento eliminado' })
  delete(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.discountsService.delete(tenant.schemaName, id);
  }
}
