import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventBusService } from '../event-bus/event-bus.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { KitchenRepository } from './kitchen.repository';
import { UpdateKitchenTicketStatusDto } from './dto/update-kitchen-ticket-status.dto';
import { KitchenQueueQueryDto } from './dto/kitchen-queue-query.dto';

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['IN_PROGRESS'],
  IN_PROGRESS: ['READY'],
  READY: ['DELIVERED'],
  DELIVERED: [],
};

const TICKET_TO_ORDER_STATUS: Record<string, string | null> = {
  IN_PROGRESS: 'IN_PROGRESS',
  READY: 'READY',
  DELIVERED: 'DELIVERED',
};

@Injectable()
export class KitchenService {
  constructor(
    private readonly kitchenRepo: KitchenRepository,
    private readonly eventBus: EventBusService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async getQueue(schemaName: string, query: KitchenQueueQueryDto) {
    const tickets = await this.kitchenRepo.findQueue(schemaName, query.branchId);
    return tickets.map((t) => this.toResponse(t));
  }

  async updateStatus(
    schemaName: string,
    id: string,
    dto: UpdateKitchenTicketStatusDto,
    userId?: string,
  ) {
    const ticket = await this.kitchenRepo.findById(schemaName, id);
    if (!ticket) throw new NotFoundException('Ticket de cocina no encontrado');

    const allowed = VALID_TRANSITIONS[ticket.status] || [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `No se puede cambiar de ${ticket.status} a ${dto.status}`,
      );
    }

    const updated = await this.kitchenRepo.updateStatus(schemaName, id, dto.status);

    const targetOrderStatus = TICKET_TO_ORDER_STATUS[dto.status];
    if (targetOrderStatus) {
      const orderValidTransitions: Record<string, string[]> = {
        PENDING: ['CONFIRMED', 'IN_PROGRESS', 'CANCELLED'],
        CONFIRMED: ['IN_PROGRESS', 'CANCELLED'],
        IN_PROGRESS: ['READY', 'CANCELLED'],
        READY: ['DELIVERED', 'CANCELLED'],
      };
      const orderAllowed = orderValidTransitions[ticket.order.status] || [];
      if (orderAllowed.includes(targetOrderStatus)) {
        try {
          await this.kitchenRepo.updateOrderStatus(schemaName, ticket.orderId, targetOrderStatus);
        } catch {
          // best-effort: no romper flujo de cocina si falla sync de orden
        }
      }
    }

    this.eventBus.emit('kitchen:ticket-updated', {
      ticketId: id,
      orderId: ticket.orderId,
      status: dto.status,
    });

    const branchId = ticket.order.table?.branchId;
    if (branchId && userId) {
      this.activityLog.log(schemaName, {
        branchId,
        userId,
        action: 'KITCHEN_STATUS_CHANGED',
        entity: 'KITCHEN_TICKET',
        entityId: id,
        changes: JSON.stringify({ from: ticket.status, to: dto.status }),
      });
    }

    return this.toResponse(updated);
  }

  private toResponse(ticket: any) {
    const now = Date.now();
    const createdAt = ticket.createdAt instanceof Date
      ? ticket.createdAt.getTime()
      : new Date(ticket.createdAt).getTime();
    return {
      id: ticket.id,
      orderId: ticket.orderId,
      orderNumber: ticket.order.folio,
      tableNumber: ticket.order.table?.number ?? null,
      type: (ticket.order.type as string)?.toLowerCase() || 'dine_in',
      items: (ticket.order.orderItems || []).map((item: any) => ({
        id: item.id,
        menuItemId: item.menuItemId,
        name: item.menuItem?.name || '',
        quantity: item.quantity,
        notes: item.notes ?? null,
      })),
      status: ticket.status,
      customerName: ticket.order.customerName || '',
      notes: ticket.order.notes ?? null,
      branchId: ticket.order.table?.branchId || '',
      priority: ticket.priority,
      startedAt: ticket.startedAt?.toISOString?.() ?? ticket.startedAt ?? null,
      completedAt: ticket.completedAt?.toISOString?.() ?? ticket.completedAt ?? null,
      createdAt: ticket.createdAt?.toISOString?.() ?? ticket.createdAt,
      updatedAt: ticket.updatedAt?.toISOString?.() ?? ticket.updatedAt,
      elapsedSeconds: Math.floor((now - createdAt) / 1000),
    };
  }
}
