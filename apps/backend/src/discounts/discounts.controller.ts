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
import { DiscountsService } from './discounts.service';
import { CreateDiscountDto } from './dto/create-discount.dto';

@ApiTags('Discounts')
@ApiBearerAuth('JWT')
@ApiSecurity('TenantSlug')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Roles('ADMIN', 'MANAGER', 'OWNER')
  @Post()
  create(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateDiscountDto,
  ) {
    return this.discountsService.create(tenant.schemaName, dto);
  }

  @Roles('ADMIN', 'MANAGER', 'OWNER')
  @Get()
  findAll(@CurrentTenant() tenant: TenantContext) {
    return this.discountsService.findAll(tenant.schemaName);
  }

  @Roles('ADMIN', 'MANAGER', 'OWNER', 'CASHIER')
  @Get('code/:code')
  findByCode(
    @CurrentTenant() tenant: TenantContext,
    @Param('code') code: string,
  ) {
    return this.discountsService.findByCode(tenant.schemaName, code);
  }

  @Roles('ADMIN', 'MANAGER', 'OWNER')
  @Get(':id')
  findById(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.discountsService.findById(tenant.schemaName, id);
  }

  @Roles('ADMIN', 'MANAGER', 'OWNER')
  @Patch(':id')
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: Partial<CreateDiscountDto>,
  ) {
    return this.discountsService.update(tenant.schemaName, id, dto);
  }

  @Roles('ADMIN', 'MANAGER', 'OWNER')
  @Delete(':id')
  delete(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.discountsService.delete(tenant.schemaName, id);
  }
}
