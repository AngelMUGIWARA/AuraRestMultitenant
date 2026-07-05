import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dtos';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Tenants')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/tenants')
export class TenantsController {
  constructor(private readonly service: TenantsService) {}

  @Get()
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Listar todos los tenants (solo OWNER/ADMIN)' })
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Crear un nuevo tenant (solo OWNER/ADMIN)' })
  create(@Body() dto: CreateTenantDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Actualizar un tenant existente (solo OWNER/ADMIN)' })
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.service.update(id, dto);
  }
}
