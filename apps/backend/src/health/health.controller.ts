import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
@Public()
export class HealthController {
  private readonly startTime = Date.now();

  @Get()
  @ApiOperation({ summary: 'Verificar estado del servidor', operationId: 'health_check' })
  @ApiResponse({ status: 200, description: 'Servidor operativo' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
