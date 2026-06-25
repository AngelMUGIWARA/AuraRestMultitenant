import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dtos';
import { TenantsService } from './tenants.service';

@ApiTags('Tenants')
@Controller('admin/tenants')
export class TenantsController {
  constructor(private readonly service: TenantsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar tenants' })
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Crear tenant' })
  create(@Body() dto: CreateTenantDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar tenant' })
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.service.update(id, dto);
  }
}
