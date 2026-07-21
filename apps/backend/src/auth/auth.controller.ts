import {
  Controller,
  Post,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { VoiceSeedDto } from './dto/voice-seed.dto';
import { VoiceLoginDto } from './dto/voice-login.dto';
import { VoiceLoginResponseDto } from './dto/voice-login-response.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant, TenantContext } from '../common/decorators/current-tenant.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

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

  @ApiBearerAuth('JWT')
  @Roles('OWNER', 'ADMIN')
  @Patch('voice-seed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Configurar la palabra clave de voz para autenticarse ante la skill de Alexa (requiere JWT normal, solo OWNER/ADMIN)',
    operationId: 'auth_setVoiceSeed',
  })
  @ApiResponse({ status: 200, description: 'Palabra clave de voz configurada' })
  @ApiResponse({ status: 403, description: 'Rol no autorizado' })
  @ApiResponse({ status: 409, description: 'voiceUsername ya está en uso' })
  setVoiceSeed(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: VoiceSeedDto,
  ): Promise<{ voiceUsername: string }> {
    if (!tenant) {
      throw new UnauthorizedException(
        'Tenant no identificado. Incluye el header x-tenant-slug.',
      );
    }
    return this.authService.setVoiceSeed(user.id, tenant.schemaName, dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('voice-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validar la palabra clave de voz (llamado por la skill de Alexa, requiere header x-tenant-slug)',
    operationId: 'auth_voiceLogin',
  })
  @ApiResponse({ status: 200, type: VoiceLoginResponseDto })
  voiceLogin(
    @Body() dto: VoiceLoginDto,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<VoiceLoginResponseDto> {
    if (!tenant) {
      throw new UnauthorizedException(
        'Tenant no identificado. Incluye el header x-tenant-slug.',
      );
    }
    return this.authService.voiceLogin(dto, tenant.schemaName);
  }
}
