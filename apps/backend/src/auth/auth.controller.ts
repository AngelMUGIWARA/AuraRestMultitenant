import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentTenant, TenantContext } from '../common/decorators/current-tenant.decorator';

@ApiTags('Auth')
@ApiSecurity('TenantSlug')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión (requiere header x-tenant-slug)', operationId: 'auth_login' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas o tenant no identificado' })
  login(
    @Body() dto: LoginDto,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<AuthResponseDto> {
    if (!tenant) {
      throw new UnauthorizedException(
        'Tenant no identificado. Incluye el header x-tenant-slug.',
      );
    }
    return this.authService.login(dto, tenant.schemaName);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token usando refresh token', operationId: 'auth_refresh' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Refresh token inválido o expirado' })
  refresh(@Body() dto: RefreshDto): Promise<AuthResponseDto> {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cerrar sesión (stateless — solo limpia tokens del cliente)', operationId: 'auth_logout' })
  @ApiResponse({ status: 200, description: 'Sesión cerrada' })
  logout(): Promise<{ message: string }> {
    return this.authService.logout();
  }
}
