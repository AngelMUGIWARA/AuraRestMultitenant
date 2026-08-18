import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma-tenant';
import { ActivityLogRepository } from '../activity-log/activity-log.repository';
import { KitchenRepository } from './kitchen.repository';
import { CreateKitchenTicketDto } from './dto/create-kitchen-ticket.dto';
import { UpdateKitchenTicketStatusDto } from './dto/update-kitchen-ticket-status.dto';
import { UpdateKitchenItemStatusDto } from './dto/update-kitchen-item-status.dto';
import { ListKitchenTicketsQueryDto } from './dto/list-kitchen-tickets-query.dto';
import { KitchenGateway } from './kitchen.gateway';

const TICKET_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

const ITEM_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: [],
  CANCELLED: [],
};

const ALLOWED_ORDER_STATUSES_FOR_KITCHEN = new Set(['PENDING', 'CONFIRMED']);

@Injectable()
export class KitchenService {
  private readonly logger = new Logger(KitchenService.name);

  constructor(
    private readonly repo: KitchenRepository,
    private readonly activityLogRepo: ActivityLogRepository,
    private readonly gateway: KitchenGateway,
  ) {}

  async createTicket(
    schemaName: string,
    dto: CreateKitchenTicketDto,
    userId: string,
  ) {
    const existingTicket = await this.repo.findTicketByOrderId(
      schemaName,
      dto.orderId,
    );
    if (existingTicket) {
      throw new ConflictException(
        'Ya existe un ticket de cocina para esta orden.',
      );
    }

    try {
      return await this.repo.runTransaction(schemaName, async (tx) => {
        const order = await this.repo.findOrderForTicket(
          schemaName,
          dto.orderId,
          tx,
        );

        if (!order) {
          throw new BadRequestException('La orden no existe.');
        }

        if (!ALLOWED_ORDER_STATUSES_FOR_KITCHEN.has(order.status)) {
          throw new BadRequestException(
            `No se puede crear un ticket para una orden en estado ${order.status}. ` +
            `Estados permitidos: PENDING, CONFIRMED.`,
          );
        }

        const branchId = order.branchId ?? undefined;

        const items = order.orderItems.map((oi: any) => ({
          orderItemId: oi.id,
          menuItemName: oi.menuItem?.name ?? 'Item',
          quantity: oi.quantity,
          notes: oi.notes ?? undefined,
        }));

        const ticket = await this.repo.createTicket(
          schemaName,
          {
            orderId: dto.orderId,
            branchId,
            priority: dto.priority,
          },
          items,
          tx,
        );

        await this.activityLogRepo.create(
          schemaName,
          {
            branchId: branchId ?? '',
            userId,
            action: 'KITCHEN_TICKET_CREATED',
            entity: 'KITCHEN_TICKET',
            entityId: ticket.id,
            changes: JSON.stringify({
              orderId: order.id,
              orderFolio: order.folio,
              priority: ticket.priority,
              itemCount: items.length,
            }),
          },
          tx,
        );

        this.gateway.broadcastQueue();
        return this.toResponse(ticket);
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const target = error?.meta?.target;
        if (Array.isArray(target) && target.includes('order_id')) {
          const existing = await this.repo.findTicketByOrderId(
            schemaName,
            dto.orderId,
          );
          if (existing) {
            throw new ConflictException(
              'Ya existe un ticket de cocina para esta orden.',
            );
            this.gateway.broadcastQueue();
          }
        }
        throw new ConflictException(
          'Conflicto de datos: no se pudo crear el ticket de cocina.',
        );
      }
      throw error;
    }
  }

  async findById(schemaName: string, id: string) {
    const ticket = await this.repo.findTicketById(schemaName, id);
    if (!ticket) {
      throw new NotFoundException(
        `Ticket de cocina con ID "${id}" no encontrado.`,
      );
    }
    return this.toResponse(ticket);
  }

  async findTickets(schemaName: string, query: ListKitchenTicketsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.KitchenTicketWhereInput = {};

    if (query.status) {
      where.status = query.status as any;
    }
    if (query.priority) {
      where.priority = query.priority as any;
    }
    if (query.branchId) {
      where.branchId = query.branchId;
    }
    if (query.tableId) {
      where.order = { tableId: query.tableId };
    }
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    const { data, total } = await this.repo.findTickets(schemaName, where, {
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: data.map((t) => this.toResponse(t)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateTicketStatus(
    schemaName: string,
    id: string,
    dto: UpdateKitchenTicketStatusDto,
    userId: string,
  ) {
    const ticket = await this.repo.findTicketById(schemaName, id);
    if (!ticket) {
      throw new NotFoundException('Ticket de cocina no encontrado.');
    }

    const allowed = TICKET_TRANSITIONS[ticket.status] || [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `No se puede cambiar de ${ticket.status} a ${dto.status}.`,
      );
    }

    if (dto.status === 'CANCELLED') {
      if (!dto.reason || dto.reason.trim().length === 0) {
        throw new BadRequestException(
          'Se requiere un motivo (reason) para cancelar un ticket.',
        );
      }
    }

    if (dto.status === 'READY') {
      const items = await this.repo.findTicketItems(schemaName, id);
      const nonCancelled = items.filter((i: any) => i.status !== 'CANCELLED');
      if (nonCancelled.length === 0) {
        throw new BadRequestException(
          'No se puede marcar READY: todos los items están cancelados. Use CANCELLED en su lugar.',
        );
      }
      const allReady = nonCancelled.every((i: any) => i.status === 'READY');
      if (!allReady) {
        throw new ConflictException(
          'No se puede marcar READY: existen items que aún no están listos.',
        );
      }
    }

    const now = new Date();
    const updateData: any = { status: dto.status };

    if (dto.status === 'PREPARING') {
      updateData.startedAt = now;
    } else if (dto.status === 'READY') {
      updateData.readyAt = now;
    } else if (dto.status === 'DELIVERED') {
      updateData.deliveredAt = now;
    }

    return this.repo.runTransaction(schemaName, async (tx) => {
      const updated = await this.repo.updateTicketStatus(
        schemaName,
        id,
        updateData,
        dto.version,
        tx,
      );

      if (!updated) {
        throw new ConflictException(
          'Conflicto de concurrencia: el ticket fue modificado por otro usuario.',
        );
      }

      const logChanges: any = { from: ticket.status, to: dto.status };
      if (dto.reason) logChanges.reason = dto.reason;

      await this.activityLogRepo.create(
        schemaName,
        {
          branchId: ticket.branchId ?? '',
          userId,
          action: `KITCHEN_TICKET_${dto.status}`,
          entity: 'KITCHEN_TICKET',
          entityId: id,
          changes: JSON.stringify(logChanges),
        },
        tx,
      );

      this.gateway.broadcastQueue();
      return this.toResponse(updated);
    });
  }

  async updateItemStatus(
    schemaName: string,
    itemId: string,
    dto: UpdateKitchenItemStatusDto,
    userId: string,
  ) {
    const targetItem = await this.repo.findItemWithTicket(schemaName, itemId);

    if (!targetItem) {
      throw new NotFoundException(
        `Item de cocina con ID "${itemId}" no encontrado.`,
      );
    }

    const ticket = (targetItem as any).ticket;

    const allowed = ITEM_TRANSITIONS[targetItem.status] || [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `No se puede cambiar item de ${targetItem.status} a ${dto.status}.`,
      );
    }

    const now = new Date();
    const updateData: any = { status: dto.status };

    if (dto.status === 'PREPARING') {
      updateData.startedAt = now;
    } else if (dto.status === 'READY') {
      updateData.readyAt = now;
    }

    return this.repo.runTransaction(schemaName, async (tx) => {
      const updatedItem = await this.repo.updateItemStatus(
        schemaName,
        itemId,
        updateData,
        targetItem.version,
        tx,
      );

      if (!updatedItem) {
        throw new ConflictException(
          'Conflicto de concurrencia: el item fue modificado por otro usuario.',
        );
      }

      await this.activityLogRepo.create(
        schemaName,
        {
          branchId: ticket.branchId ?? '',
          userId,
          action: `KITCHEN_ITEM_${dto.status}`,
          entity: 'KITCHEN_TICKET_ITEM',
          entityId: itemId,
          changes: JSON.stringify({
            ticketId: ticket.id,
            menuItemName: targetItem.menuItemName,
            from: targetItem.status,
            to: dto.status,
          }),
        },
        tx,
      );
      this.gateway.broadcastQueue();

      const allItems = await this.repo.findTicketItems(
        schemaName,
        ticket.id,
        tx,
      );

      const newTicketStatus = this.deriveTicketStatus(allItems);

      if (newTicketStatus && newTicketStatus !== ticket.status) {
        const ticketUpdateData: any = { status: newTicketStatus };
        if (newTicketStatus === 'PREPARING') ticketUpdateData.startedAt = now;
        if (newTicketStatus === 'READY') ticketUpdateData.readyAt = now;
        if (newTicketStatus === 'DELIVERED') ticketUpdateData.deliveredAt = now;

        const updatedTicket = await this.repo.updateTicketStatus(
          schemaName,
          ticket.id,
          ticketUpdateData,
          ticket.version,
          tx,
        );

        if (updatedTicket) {
          await this.activityLogRepo.create(
            schemaName,
            {
              branchId: ticket.branchId ?? '',
              userId,
              action: `KITCHEN_TICKET_${newTicketStatus}`,
              entity: 'KITCHEN_TICKET',
              entityId: ticket.id,
              changes: JSON.stringify({
                from: ticket.status,
                to: newTicketStatus,
                reason: 'auto-derived from item statuses',
              }),
            },
            tx,
          );
        }

        return this.toResponse(
          updatedTicket ?? (await this.repo.findTicketById(schemaName, ticket.id, tx))!,
        );
      }

      const refreshedTicket = await this.repo.findTicketById(
        schemaName,
        ticket.id,
        tx,
      );

      return this.toResponse(refreshedTicket!);
    });
  }

  private deriveTicketStatus(
    items: Array<{ status: string }>,
  ): string | null {
    if (items.length === 0) return null;

    const nonCancelled = items.filter((i) => i.status !== 'CANCELLED');

    if (nonCancelled.length === 0) return 'CANCELLED';

    const allReady = nonCancelled.every((i) => i.status === 'READY');
    if (allReady) return 'READY';

    const anyPreparing = nonCancelled.some(
      (i) => i.status === 'PREPARING' || i.status === 'READY',
    );
    if (anyPreparing) return 'PREPARING';

    return null;
  }

  private toResponse(ticket: any) {
    return {
      id: ticket.id,
      orderId: ticket.orderId,
      orderNumber: ticket.order?.folio ?? null,
      branchId: ticket.branchId ?? ticket.order?.branchId ?? null,
      status: ticket.status,
      priority: ticket.priority,
      version: ticket.version,
      items: (ticket.items ?? []).map((item: any) => ({
        id: item.id,
        orderItemId: item.orderItemId,
        menuItemName: item.menuItemName,
        quantity: item.quantity,
        notes: item.notes ?? null,
        status: item.status,
        version: item.version,
        startedAt: item.startedAt?.toISOString?.() ?? item.startedAt ?? null,
        readyAt: item.readyAt?.toISOString?.() ?? item.readyAt ?? null,
      })),
      customerName: ticket.order?.customerName ?? null,
      tableNumber: ticket.order?.table?.number?.toString() ?? null,
      notes: ticket.order?.notes ?? null,
      startedAt: ticket.startedAt?.toISOString?.() ?? ticket.startedAt ?? null,
      readyAt: ticket.readyAt?.toISOString?.() ?? ticket.readyAt ?? null,
      deliveredAt:
        ticket.deliveredAt?.toISOString?.() ?? ticket.deliveredAt ?? null,
      createdAt: ticket.createdAt?.toISOString?.() ?? ticket.createdAt,
      updatedAt: ticket.updatedAt?.toISOString?.() ?? ticket.updatedAt,
    };
  }
}
