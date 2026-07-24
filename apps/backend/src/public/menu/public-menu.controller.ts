import {
  Controller,
  Get,
  Param,
  Query,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiSecurity,
} from '@nestjs/swagger';

import { PublicMenuService } from './public-menu.service';
import { Public } from '../../common/decorators/public.decorator';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';
import { PublicMenuResponseDto, PublicMenuQueryDto } from './dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Public Menu')
@ApiSecurity('TenantSlug')
@UseInterceptors(TransformInterceptor)
@Controller('public/menu')
export class PublicMenuController {
  constructor(private readonly service: PublicMenuService) {}

  @Public()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Get('/:tenantSlug')
  @ApiOperation({
    summary: 'Obtener menú público de tenant',
    operationId: 'public_menu_getByTenant',
  })
  @ApiParam({
    name: 'tenantSlug',
    type: String,
    description: 'Identificador público del tenant (slug)',
  })
  @ApiQuery({
    name: 'branch',
    required: false,
    type: String,
    description: 'Branch slug o ID (opcional)',
  })
  @ApiResponse({
    status: 200,
    type: PublicMenuResponseDto,
    description: 'Menú público disponible',
  })
  @ApiResponse({ status: 404, description: 'Tenant o sucursal no encontrada' })
  @ApiResponse({ status: 400, description: 'Parámetros inválidos' })
  getMenuByTenant(
    @Param('tenantSlug') tenantSlug: string,
    @Query() query: PublicMenuQueryDto,
  ) {
    if (!tenantSlug || tenantSlug.trim() === '') {
      throw new BadRequestException('Tenant slug requerido');
    }

    return this.service.getMenuByTenantAndBranch(tenantSlug, query.branch);
  }
}
