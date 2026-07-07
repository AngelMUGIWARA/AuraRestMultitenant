import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { $Enums, Prisma } from '../generated/prisma-tenant';
import type { Prisma as PrismaType } from '../generated/prisma-tenant';
import { EventBusService } from '../event-bus/event-bus.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import {
  mapOrderStatusFromDb,
} from '../common/utils/order-mapper';
import { OrdersRepository } from './orders.repository';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrdersService {
  private readonly TAX_RATE = new Prisma.Decimal(0.15);
  private readonly MAX_FOLIO_RETRIES = 5;

  constructor(
    private readonly ordersRepo: OrdersRepository,
    private readonly eventBus: EventBusService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async create(schemaName: string, dto: CreateOrderDto, userId: string) {
    const menuItems = await this.ordersRepo.findMenuItemsByIds(
      schemaName,
      dto.items.map((i) => i.menuItemId),
    );
    if (menuItems.length !== new Set(dto.items.map((i) => i.menuItemId)).size) {
      throw new BadRequestException('Algunos platos no existen');
    }
    const menuItemMap = new Map(menuItems.map((m) => [m.id, m.price]));

    return this.ordersRepo.runTransaction(
      schemaName,
      async (tx: PrismaType.TransactionClient) => {
        const orderItemsData = dto.items.map((item) => {
          const unitPrice = menuItemMap.get(item.menuItemId)!;
          const subtotal = new Prisma.Decimal(unitPrice.toString()).mul(item.quantity);
          return {
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            unitPrice,
            subtotal: subtotal.toFixed(2),
            notes: item.notes,
          };
        });

        const subtotal = orderItemsData.reduce(
          (acc, item) => acc.plus(item.subtotal),
          new Prisma.Decimal(0),
        );
        const tax = subtotal.mul(this.TAX_RATE);
        const total = subtotal.plus(tax);

        let lastError: unknown = null;
        for (let attempt = 0; attempt < this.MAX_FOLIO_RETRIES; attempt++) {
          try {
            const folio = await this.generateFolio(schemaName, tx);

            const order = await this.ordersRepo.create(
              schemaName,
              {
                folio,
                type: dto.type as $Enums.OrderType,
                status: $Enums.OrderStatus.PENDING,
                customerName: dto.customerName,
                notes: dto.notes,
                subtotal: subtotal.toFixed(2),
                tax: tax.toFixed(2),
                total: total.toFixed(2),
                table: dto.tableId ? { connect: { id: dto.tableId } } : undefined,
                user: { connect: { id: userId } },
                orderItems: { create: orderItemsData },
              },
              tx,
            );

            if (dto.tableId) {
              await this.ordersRepo.updateTableStatus(
                schemaName,
                dto.tableId,
                'OCCUPIED',
                tx,
              );
            }

            this.eventBus.emit('order:created', { orderId: order.id, folio });

            let orderBranchId: string | undefined;
            if (dto.tableId) {
              const table = await this.ordersRepo.findTableById(schemaName, dto.tableId, tx);
              orderBranchId = table?.branchId;
            }
            if (orderBranchId) {
              this.activityLog.log(schemaName, {
                branchId: orderBranchId,
                userId,
                action: 'ORDER_CREATED',
                entity: 'ORDER',
                entityId: order.id,
                changes: JSON.stringify({ folio, total: total.toFixed(2), type: dto.type }),
              }, tx);
            }

            const kitchenTypes = ['DINE_IN', 'TAKEOUT', 'DELIVERY'];
            if (kitchenTypes.includes(dto.type)) {
              await this.ordersRepo.createKitchenTicket(schemaName, order.id, tx);
              if (orderBranchId) {
                this.activityLog.log(schemaName, {
                  branchId: orderBranchId,
                  userId,
                  action: 'KITCHEN_TICKET_CREATED',
                  entity: 'KITCHEN_TICKET',
                  entityId: order.id,
                  changes: JSON.stringify({ orderFolio: folio, orderType: dto.type }),
                }, tx);
              }
            }

            return this.toResponse(order);
          } catch (err: any) {
            if (err?.code === 'P2002' && attempt < this.MAX_FOLIO_RETRIES - 1) {
              lastError = err;
              continue;
            }
            throw err;
          }
        }

        throw lastError ?? new Error('No se pudo generar un folio único');
      },
    );
  }

  async findAll(
    schemaName: string,
    query: {
      status?: string;
      type?: string;
      search?: string;
      date?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const where: any = {};

    if (query.status) {
      const map: Record<string, string> = {
        pending: 'PENDING',
        confirmed: 'CONFIRMED',
        preparing: 'IN_PROGRESS',
        ready: 'READY',
        delivered: 'DELIVERED',
        paid: 'PAID',
        cancelled: 'CANCELLED',
      };
      where.status = map[query.status] || query.status;
    }
    if (query.type) where.type = query.type;
    if (query.search) {
      where.OR = [
        { folio: { contains: query.search, mode: 'insensitive' } },
        { customerName: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.date) {
      const start = new Date(query.date);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      where.createdAt = { gte: start, lt: end };
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.ordersRepo.findMany(schemaName, {
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.ordersRepo.count(schemaName, where),
    ]);

    return {
      data: orders.map((o) => this.toResponse(o)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(schemaName: string, id: string) {
    const order = await this.ordersRepo.findById(schemaName, id);
    if (!order) throw new NotFoundException('Pedido no encontrado');
    return this.toResponse(order);
  }

  async updateStatus(schemaName: string, id: string, dto: UpdateOrderStatusDto, userId?: string) {
    const order = await this.ordersRepo.findById(schemaName, id);
    if (!order) throw new NotFoundException('Pedido no encontrado');

    const validTransitions: Record<string, string[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['READY', 'CANCELLED'],
      READY: ['DELIVERED', 'CANCELLED'],
      DELIVERED: ['PAID'],
      PAID: [],
      CANCELLED: [],
    };

    const allowed = validTransitions[order.status] || [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `No se puede cambiar de ${order.status} a ${dto.status}`,
      );
    }

    if (dto.status === 'PAID') {
      try {
        return await this.ordersRepo.runTransaction(
          schemaName,
          async (tx: PrismaType.TransactionClient) => {
            const updated = await this.ordersRepo.updateWithVersion(
              schemaName,
              id,
              order.version,
              {
                status: $Enums.OrderStatus.PAID,
                ...(dto.notes ? { notes: dto.notes } : {}),
              },
              tx,
            );

            if (updated.table) {
              await this.ordersRepo.updateTableStatus(
                schemaName,
                updated.table.id,
                'AVAILABLE',
                tx,
              );
            }

            const branchId = updated.table?.branchId || order.table?.branchId;
            if (branchId && userId) {
              this.activityLog.log(schemaName, {
                branchId,
                userId,
                action: 'ORDER_STATUS_CHANGED',
                entity: 'ORDER',
                entityId: id,
                changes: JSON.stringify({ from: order.status, to: dto.status }),
              }, tx);
            }

            return this.toResponse(updated);
          },
        );
      } catch (err: any) {
        if (err?.code === 'P2025') {
          throw new ConflictException(
            'La orden fue modificada por otro usuario. Recarga e intenta de nuevo.',
          );
        }
        throw err;
      }
    }

    const data: any = { status: dto.status as $Enums.OrderStatus };
    if (dto.notes) data.notes = dto.notes;

    const updated = await this.ordersRepo.update(schemaName, id, data);

    const branchId = updated.table?.branchId || order.table?.branchId;
    if (branchId && userId) {
      this.activityLog.log(schemaName, {
        branchId,
        userId,
        action: 'ORDER_STATUS_CHANGED',
        entity: 'ORDER',
        entityId: id,
        changes: JSON.stringify({ from: order.status, to: dto.status }),
      });
    }

    return this.toResponse(updated);
  }

  async cancel(schemaName: string, id: string, reason?: string, userId?: string) {
    const order = await this.ordersRepo.findById(schemaName, id);
    if (!order) throw new NotFoundException('Pedido no encontrado');

    if (['PAID', 'CANCELLED'].includes(order.status)) {
      throw new BadRequestException('El pedido ya no se puede cancelar');
    }

    try {
      return await this.ordersRepo.runTransaction(
        schemaName,
        async (tx: PrismaType.TransactionClient) => {
          const data: any = { status: $Enums.OrderStatus.CANCELLED };
          if (reason) data.notes = reason;

          const updated = await this.ordersRepo.updateWithVersion(
            schemaName,
            id,
            order.version,
            data,
            tx,
          );

          if (updated.table) {
            await this.ordersRepo.updateTableStatus(
              schemaName,
              updated.table.id,
              'AVAILABLE',
              tx,
            );
          }

          const branchId = updated.table?.branchId || order.table?.branchId;
          if (branchId && userId) {
            this.activityLog.log(schemaName, {
              branchId,
              userId,
              action: 'ORDER_CANCELLED',
              entity: 'ORDER',
              entityId: id,
              changes: JSON.stringify({ reason: reason || null }),
            }, tx);
          }

          return this.toResponse(updated);
        },
      );
    } catch (err: any) {
      if (err?.code === 'P2025') {
        throw new ConflictException(
          'La orden fue modificada por otro usuario. Recarga e intenta de nuevo.',
        );
      }
      throw err;
    }
  }

  async getStats(schemaName: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalToday,
      pendingOrders,
      preparingOrders,
      readyOrders,
      completedToday,
      cancelledToday,
    ] = await Promise.all([
      this.ordersRepo.count(schemaName, {
        createdAt: { gte: today, lt: tomorrow },
      }),
      this.ordersRepo.count(schemaName, { status: 'PENDING' }),
      this.ordersRepo.count(schemaName, { status: 'IN_PROGRESS' }),
      this.ordersRepo.count(schemaName, { status: 'READY' }),
      this.ordersRepo.count(schemaName, {
        createdAt: { gte: today, lt: tomorrow },
        status: 'PAID',
      }),
      this.ordersRepo.count(schemaName, {
        createdAt: { gte: today, lt: tomorrow },
        status: 'CANCELLED',
      }),
    ]);

    const paidOrders = await this.ordersRepo.findMany(schemaName, {
      where: {
        createdAt: { gte: today, lt: tomorrow },
        status: 'PAID',
      },
    });

    const revenueToday = paidOrders.reduce(
      (sum, o) => sum + Number(o.total),
      0,
    );
    const avgOrderValue = completedToday > 0 ? revenueToday / completedToday : 0;

    return {
      totalToday,
      pendingOrders,
      preparingOrders,
      readyOrders,
      completedToday,
      cancelledToday,
      revenueToday,
      avgOrderValue,
    };
  }

  private async generateFolio(
    schemaName: string,
    tx?: PrismaType.TransactionClient,
  ): Promise<string> {
    const date = new Date();
    const prefix = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const count = await this.ordersRepo.count(
      schemaName,
      { folio: { startsWith: prefix } },
      tx,
    );
    return `${prefix}-${String(count + 1).padStart(4, '0')}`;
  }

  private toResponse(order: any) {
    const hasPaidPayment =
      Array.isArray(order.payments) &&
      order.payments.some((p: any) => p.status === 'COMPLETED');

    return {
      id: order.id,
      orderNumber: order.folio,
      status: mapOrderStatusFromDb(order.status),
      paymentStatus: hasPaidPayment ? 'paid' : 'pending',
      type: order.type?.toLowerCase() || 'dine_in',
      items: (order.orderItems || []).map((item: any) => ({
        id: item.id,
        menuItemId: item.menuItemId,
        name: item.menuItem?.name || '',
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.subtotal),
        notes: item.notes || null,
      })),
      itemCount: (order.orderItems || []).length,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      total: Number(order.total),
      customerName: order.customerName || '',
      tableNumber: order.table?.number || null,
      tableId: order.table?.id || null,
      notes: order.notes || null,
      branchId: '',
      createdAt: order.createdAt?.toISOString(),
      updatedAt: order.updatedAt?.toISOString(),
    };
  }
}
