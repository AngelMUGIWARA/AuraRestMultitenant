import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentTenant, TenantContext } from '../common/decorators/current-tenant.decorator';

@ApiTags('Auth')
@ApiSecurity('TenantSlug')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión (requiere header x-tenant-slug)' })
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
}
