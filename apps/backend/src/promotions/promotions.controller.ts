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
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant, TenantContext } from '../common/decorators/current-tenant.decorator';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';

@ApiTags('Promotions')
@ApiBearerAuth('JWT')
@ApiSecurity('TenantSlug')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Roles('ADMIN', 'MANAGER', 'OWNER')
  @Post()
  create(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreatePromotionDto,
  ) {
    return this.promotionsService.create(tenant.schemaName, dto);
  }

  @Roles('ADMIN', 'MANAGER', 'OWNER', 'CASHIER')
  @Get()
  findAll(@CurrentTenant() tenant: TenantContext) {
    return this.promotionsService.findAll(tenant.schemaName);
  }

  @Roles('ADMIN', 'MANAGER', 'OWNER', 'CASHIER')
  @Get('active')
  findActive(@CurrentTenant() tenant: TenantContext) {
    return this.promotionsService.findActive(tenant.schemaName);
  }

  @Roles('ADMIN', 'MANAGER', 'OWNER')
  @Get(':id')
  findById(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.promotionsService.findById(tenant.schemaName, id);
  }

  @Roles('ADMIN', 'MANAGER', 'OWNER')
  @Patch(':id')
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: Partial<CreatePromotionDto>,
  ) {
    return this.promotionsService.update(tenant.schemaName, id, dto);
  }

  @Roles('ADMIN', 'MANAGER', 'OWNER')
  @Delete(':id')
  delete(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.promotionsService.delete(tenant.schemaName, id);
  }
}
