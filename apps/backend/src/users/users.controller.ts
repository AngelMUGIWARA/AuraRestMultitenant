import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentTenant,
  TenantContext,
} from '../common/decorators/current-tenant.decorator';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { ChangeUserStatusDto } from './dto/change-user-status.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  PaginatedUsersDto,
  UserResponseDto,
  UserStatsDto,
} from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@ApiSecurity('TenantSlug')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
// Envuelve la respuesta en { data, message, success, timestamp }: es el
// contrato ApiResponse<T> de @maison/types que consume el frontend.
@UseInterceptors(TransformInterceptor)
@Controller('admin/users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @Roles('OWNER')
  @ApiOperation({ summary: 'Listar usuarios del tenant' })
  @ApiResponse({ status: 200, type: PaginatedUsersDto })
  findAll(
    @CurrentTenant() tenant: TenantContext,
    @Query() pagination: PaginationDto,
    @Query('branchId') branchId?: string,
  ): Promise<PaginatedUsersDto> {
    return this.service.findAll(tenant.schemaName, pagination, branchId);
  }

  // Debe declararse ANTES de @Get(':id'): de lo contrario la ruta param
  // captura "stats" como si fuera un id y responde 404.
  @Get('stats')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Estadísticas de usuarios del tenant' })
  @ApiResponse({ status: 200, type: UserStatsDto })
  getStats(@CurrentTenant() tenant: TenantContext): Promise<UserStatsDto> {
    return this.service.getStats(tenant.schemaName);
  }

  @Get(':id')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Obtener un usuario por ID' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  findOne(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ): Promise<UserResponseDto> {
    return this.service.findOne(tenant.schemaName, id);
  }

  @Post()
  @Roles('OWNER')
  @ApiOperation({ summary: 'Crear un nuevo usuario' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  @ApiResponse({ status: 409, description: 'Email ya registrado' })
  create(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateUserDto,
  ): Promise<UserResponseDto> {
    return this.service.create(tenant.schemaName, dto);
  }

  @Post('invite')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Invitar a un usuario (crea cuenta provisional)' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  @ApiResponse({ status: 409, description: 'Email ya registrado' })
  invite(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: InviteUserDto,
  ): Promise<UserResponseDto> {
    return this.service.invite(tenant.schemaName, dto);
  }

  @Patch(':id')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Actualizar un usuario' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.service.update(tenant.schemaName, id, dto);
  }

  @Patch(':id/status')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Cambiar el estado de un usuario' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  changeStatus(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: ChangeUserStatusDto,
  ): Promise<UserResponseDto> {
    return this.service.changeStatus(tenant.schemaName, id, body.status);
  }

  @Delete(':id')
  @Roles('OWNER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un usuario' })
  @ApiResponse({ status: 204 })
  remove(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.service.remove(tenant.schemaName, id);
  }
}
