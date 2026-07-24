import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentTenant,
  TenantContext,
} from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { KitchenService } from './kitchen.service';
import { CreateKitchenTicketDto } from './dto/create-kitchen-ticket.dto';
import { UpdateKitchenTicketStatusDto } from './dto/update-kitchen-ticket-status.dto';
import { UpdateKitchenItemStatusDto } from './dto/update-kitchen-item-status.dto';
import { ListKitchenTicketsQueryDto } from './dto/list-kitchen-tickets-query.dto';
import {
  KitchenTicketResponseDto,
  PaginatedKitchenTicketsDto,
} from './dto/kitchen-ticket-response.dto';

@ApiTags('Kitchen')
@ApiBearerAuth('JWT')
@ApiSecurity('TenantSlug')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('kitchen')
export class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  @Roles('ADMIN', 'OWNER', 'WAITER')
  @Post('tickets')
  @ApiOperation({
    summary: 'Crear un ticket de cocina a partir de una orden',
    operationId: 'kitchen_createTicket',
  })
  @ApiResponse({
    status: 201,
    description: 'Ticket creado exitosamente',
    type: KitchenTicketResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Orden no existe o está cancelada' })
  @ApiResponse({
    status: 409,
    description: 'Ya existe un ticket para esta orden',
  })
  createTicket(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateKitchenTicketDto,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.sub ?? user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Usuario no autenticado.');
    }
    return this.kitchenService.createTicket(
      tenant.schemaName,
      dto,
      userId,
    );
  }

  @Roles('ADMIN', 'OWNER', 'MANAGER', 'CHEF', 'KITCHEN_STAFF', 'WAITER')
  @Get('tickets')
  @ApiOperation({
    summary: 'Listar tickets de cocina con filtros y paginación',
    operationId: 'kitchen_findTickets',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de tickets',
    type: PaginatedKitchenTicketsDto,
  })
  findTickets(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ListKitchenTicketsQueryDto,
  ) {
    return this.kitchenService.findTickets(tenant.schemaName, query);
  }

  @Roles('ADMIN', 'OWNER', 'MANAGER', 'CHEF', 'KITCHEN_STAFF', 'WAITER')
  @Get('tickets/:id')
  @ApiOperation({
    summary: 'Obtener un ticket de cocina por ID',
    operationId: 'kitchen_findTicketById',
  })
  @ApiParam({ name: 'id', description: 'ID del ticket de cocina' })
  @ApiResponse({
    status: 200,
    description: 'Ticket encontrado',
    type: KitchenTicketResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Ticket no encontrado' })
  findTicketById(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.kitchenService.findById(tenant.schemaName, id);
  }

  @Roles('ADMIN', 'OWNER', 'MANAGER', 'CHEF', 'KITCHEN_STAFF')
  @Patch('tickets/:id/status')
  @ApiOperation({
    summary: 'Actualizar estado del ticket de cocina',
    operationId: 'kitchen_updateTicketStatus',
  })
  @ApiParam({ name: 'id', description: 'ID del ticket de cocina' })
  @ApiResponse({
    status: 200,
    description: 'Ticket actualizado',
    type: KitchenTicketResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Ticket no encontrado' })
  @ApiResponse({ status: 400, description: 'Transición de estado no válida' })
  @ApiResponse({ status: 409, description: 'Conflicto de concurrencia' })
  updateTicketStatus(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateKitchenTicketStatusDto,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.sub ?? user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Usuario no autenticado.');
    }
    return this.kitchenService.updateTicketStatus(
      tenant.schemaName,
      id,
      dto,
      userId,
    );
  }

  @Roles('ADMIN', 'OWNER', 'MANAGER', 'CHEF', 'KITCHEN_STAFF')
  @Patch('items/:id/status')
  @ApiOperation({
    summary: 'Actualizar estado de un item de cocina',
    operationId: 'kitchen_updateItemStatus',
  })
  @ApiParam({ name: 'id', description: 'ID del item de cocina' })
  @ApiResponse({
    status: 200,
    description: 'Ticket con item actualizado',
    type: KitchenTicketResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Item no encontrado' })
  @ApiResponse({ status: 400, description: 'Transición de estado no válida' })
  @ApiResponse({ status: 409, description: 'Conflicto de concurrencia' })
  updateItemStatus(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateKitchenItemStatusDto,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.sub ?? user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Usuario no autenticado.');
    }
    return this.kitchenService.updateItemStatus(
      tenant.schemaName,
      id,
      dto,
      userId,
    );
  }
}
