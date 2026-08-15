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
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto, PromotionResponseDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@ApiTags('Promotions')
@ApiBearerAuth('JWT')
@ApiSecurity('TenantSlug')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Roles('MANAGER', 'OWNER')
  @Post()
  @ApiOperation({ summary: 'Crear promoción', operationId: 'promotions_create' })
  @ApiResponse({ status: 201, type: PromotionResponseDto })
  create(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreatePromotionDto,
  ) {
    return this.promotionsService.create(tenant.schemaName, dto);
  }

  @Roles('MANAGER', 'OWNER', 'CASHIER')
  @Get()
  @ApiOperation({ summary: 'Listar promociones', operationId: 'promotions_findAll' })
  @ApiResponse({ status: 200, type: [PromotionResponseDto] })
  findAll(@CurrentTenant() tenant: TenantContext) {
    return this.promotionsService.findAll(tenant.schemaName);
  }

  @Roles('MANAGER', 'OWNER', 'CASHIER')
  @Get('active')
  @ApiOperation({ summary: 'Listar promociones activas', operationId: 'promotions_findActive' })
  @ApiResponse({ status: 200, type: [PromotionResponseDto] })
  findActive(@CurrentTenant() tenant: TenantContext) {
    return this.promotionsService.findActive(tenant.schemaName);
  }

  @Roles('MANAGER', 'OWNER')
  @Get(':id')
  @ApiOperation({ summary: 'Obtener promoción por ID', operationId: 'promotions_findById' })
  @ApiResponse({ status: 200, type: PromotionResponseDto })
  @ApiResponse({ status: 404, description: 'Promoción no encontrada' })
  findById(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.promotionsService.findById(tenant.schemaName, id);
  }

  @Roles('MANAGER', 'OWNER')
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar promoción', operationId: 'promotions_update' })
  @ApiResponse({ status: 200, type: PromotionResponseDto })
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdatePromotionDto,
  ) {
    return this.promotionsService.update(tenant.schemaName, id, dto);
  }

  @Roles('MANAGER', 'OWNER')
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar promoción', operationId: 'promotions_delete' })
  @ApiResponse({ status: 200, description: 'Promoción eliminada' })
  delete(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.promotionsService.delete(tenant.schemaName, id);
  }
}
