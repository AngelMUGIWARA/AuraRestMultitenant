import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { SystemJwtAuthGuard } from '../guards/system-jwt-auth.guard';
import { SystemAuditLogService } from './system-audit-log.service';

@ApiTags('System Admin — Audit Log')
@ApiBearerAuth('SystemJWT')
@Controller('system-admin/audit-logs')
export class SystemAuditLogController {
  constructor(private readonly service: SystemAuditLogService) {}

  @Public()
  @UseGuards(SystemJwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Listar el log de auditoría global de la plataforma (solo Super Admin)', operationId: 'systemAdmin_findAuditLogs' })
  @ApiResponse({ status: 200, description: 'Lista de eventos de auditoría' })
  findAll() {
    return this.service.findAll();
  }
}
