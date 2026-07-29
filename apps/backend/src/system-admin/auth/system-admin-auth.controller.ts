import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { SystemAdminAuthService } from './system-admin-auth.service';
import { SystemAdminLoginDto } from './dto/system-admin-login.dto';
import { SystemAdminRefreshDto } from './dto/system-admin-refresh.dto';
import { SystemAdminAuthResponseDto } from './dto/system-admin-auth-response.dto';

@ApiTags('System Admin — Auth')
@Controller('system-admin/auth')
export class SystemAdminAuthController {
  constructor(private readonly authService: SystemAdminAuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login de Super Admin (independiente del login por tenant)', operationId: 'systemAdmin_login' })
  @ApiResponse({ status: 200, type: SystemAdminAuthResponseDto })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  login(@Body() dto: SystemAdminLoginDto): Promise<SystemAdminAuthResponseDto> {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token de Super Admin', operationId: 'systemAdmin_refresh' })
  @ApiResponse({ status: 200, type: SystemAdminAuthResponseDto })
  @ApiResponse({ status: 401, description: 'Refresh token inválido o expirado' })
  refresh(@Body() dto: SystemAdminRefreshDto): Promise<SystemAdminAuthResponseDto> {
    return this.authService.refreshToken(dto.refreshToken);
  }
}
