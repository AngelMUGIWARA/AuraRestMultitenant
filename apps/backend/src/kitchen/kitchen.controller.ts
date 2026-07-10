import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant, TenantContext } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { KitchenService } from './kitchen.service';
import { KitchenTicketResponseDto } from './dto/kitchen-ticket-response.dto';
import { UpdateKitchenTicketStatusDto } from './dto/update-kitchen-ticket-status.dto';
import { KitchenQueueQueryDto } from './dto/kitchen-queue-query.dto';

@ApiTags('Kitchen')
@ApiBearerAuth('JWT')
@ApiSecurity('TenantSlug')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('kitchen')
export class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  @Get('queue')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'CHEF', 'KITCHEN_STAFF')
  @ApiOperation({ summary: 'Obtener cola de cocina', operationId: 'kitchen_getQueue' })
  @ApiResponse({ status: 200, type: [KitchenTicketResponseDto] })
  getQueue(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: KitchenQueueQueryDto,
  ) {
    return this.kitchenService.getQueue(tenant.schemaName, query);
  }

  @Patch('tickets/:id/status')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'CHEF', 'KITCHEN_STAFF')
  @ApiOperation({ summary: 'Actualizar estado de ticket de cocina', operationId: 'kitchen_updateTicketStatus' })
  @ApiResponse({ status: 200, type: KitchenTicketResponseDto })
  @ApiResponse({ status: 404, description: 'Ticket no encontrado' })
  @ApiResponse({ status: 400, description: 'Transición no válida' })
  updateStatus(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateKitchenTicketStatusDto,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.sub ?? user?.userId;
    return this.kitchenService.updateStatus(tenant.schemaName, id, dto, userId);
  }
}
