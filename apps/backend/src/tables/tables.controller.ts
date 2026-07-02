import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant, TenantContext } from '../common/decorators/current-tenant.decorator';
import { TablesService } from './tables.service';
import { UpdateTableStatusDto } from './dto/update-table.dto';

@ApiTags('Tables')
@ApiBearerAuth('JWT')
@ApiSecurity('TenantSlug')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) { }

  @Public()
  @Get()
  findAll(@CurrentTenant() tenant: TenantContext) {
    return this.tablesService.findAll(tenant.schemaName);
  }

  @Public()
  @Get(':id')
  findById(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.tablesService.findById(tenant.schemaName, id);
  }

  @Roles('ADMIN', 'MANAGER', 'OWNER', 'CASHIER')
  @Patch(':id/status')
  updateStatus(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() updateDto: UpdateTableStatusDto, // Usa este nuevo DTO
  ) {
    return this.tablesService.updateStatus(tenant.schemaName, id, updateDto.status);
  }
}