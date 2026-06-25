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
import { ChangeUserStatusDto } from './dto/change-user-status.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginatedUsersDto, UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@ApiSecurity('TenantSlug')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('admin/users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Listar usuarios del tenant' })
  @ApiResponse({ status: 200, type: PaginatedUsersDto })
  findAll(
    @CurrentTenant() tenant: TenantContext,
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedUsersDto> {
    return this.service.findAll(tenant.schemaName, pagination);
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
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
  @Roles('OWNER', 'ADMIN')
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
  @Roles('OWNER', 'ADMIN')
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
  @Roles('OWNER', 'ADMIN')
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
  @Roles('OWNER', 'ADMIN')
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
  @Roles('OWNER', 'ADMIN')
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
