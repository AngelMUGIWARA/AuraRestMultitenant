import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { $Enums, Prisma, TableStatus } from '../generated/prisma-tenant';
import type { Prisma as PrismaType } from '../generated/prisma-tenant';
import { EventBusService } from '../event-bus/event-bus.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { TaxConfigService, DEFAULT_TAX_RATE } from '../tax-config/tax-config.service';
import { OrderPromotionService } from '../promotions/order-promotion.service';
import {
  mapOrderStatusFromDb,
  mapOrderPaymentStatusFromDb,
  mapPaymentMethodFromDb,
} from '../common/utils/order-mapper';
import { OrdersRepository } from './orders.repository';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrdersService {
  private readonly MAX_FOLIO_RETRIES = 5;

  constructor(
    private readonly ordersRepo: OrdersRepository,
    private readonly eventBus: EventBusService,
    private readonly activityLog: ActivityLogService,
    private readonly taxConfig: TaxConfigService,
    @Inject(forwardRef(() => OrderPromotionService))
    private readonly orderPromotionService: OrderPromotionService,
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

    let branchId: string | undefined;
    if (dto.tableId) {
      const table = await this.ordersRepo.findTableById(schemaName, dto.tableId);
      branchId = table?.branchId;
    } else if (dto.branchId) {
      branchId = dto.branchId;
    }

    const taxRate = await this.taxConfig.getTaxRate(schemaName, branchId);

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
        const tax = subtotal.mul(new Prisma.Decimal(taxRate));
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
                TableStatus.OCCUPIED,
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
                TableStatus.AVAILABLE,
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

  async printTicket(schemaName: string, id: string) {
    const order = await this.ordersRepo.findById(schemaName, id);
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (order.ticketPrinted) {
      return this.toResponse(order);
    }
    const updated = await this.ordersRepo.update(schemaName, id, {
      ticketPrinted: true,
    });
    return this.toResponse(updated);
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
    const subtotalNum = Number(order.subtotal);
    const discountAmountNum = order.discountAmount !== null && order.discountAmount !== undefined ? Number(order.discountAmount) : null;
    const taxableSubtotalNum = order.taxableSubtotal !== null && order.taxableSubtotal !== undefined ? Number(order.taxableSubtotal) : null;
    const taxNum = Number(order.tax);
    const baseForTax = taxableSubtotalNum !== null && taxableSubtotalNum > 0 ? taxableSubtotalNum : subtotalNum;
    const taxRate = baseForTax > 0 ? taxNum / baseForTax : DEFAULT_TAX_RATE;

    const completedPayments = Array.isArray(order.payments)
      ? order.payments.filter((p: any) => p.status === 'COMPLETED' || p.status === 'PARTIALLY_REFUNDED' || p.status === 'REFUNDED')
      : [];
    const completedPaidAmount = completedPayments.reduce(
      (sum: number, p: any) => sum + Number(p.amount),
      0,
    );

    const completedRefunds = Array.isArray(order.refunds)
      ? order.refunds.filter((r: any) => r.status === 'COMPLETED')
      : [];
    const completedRefundAmount = completedRefunds.reduce(
      (sum: number, r: any) => sum + Number(r.amount),
      0,
    );
    const netPaidAmount = Math.max(0, completedPaidAmount - completedRefundAmount);

    const totalNum = Number(order.total);
    const totalBeforeTipNum = order.totalBeforeTip ? Number(order.totalBeforeTip) : totalNum;
    const amountDueForPaymentsNum = order.amountDueForPayments ? Number(order.amountDueForPayments) : totalNum;
    const remainingAmount = Number(Math.max(0, amountDueForPaymentsNum - completedPaidAmount).toFixed(2));
    const isFullyPaid = remainingAmount <= 0;

    const distinctMethods: string[] = [];
    for (const p of completedPayments) {
      const method = mapPaymentMethodFromDb(p.method);
      if (!distinctMethods.includes(method)) {
        distinctMethods.push(method);
      }
    }

    const paymentStatusRaw = order.paymentStatus ?? (isFullyPaid ? 'PAID' : 'UNPAID');

    return {
      id: order.id,
      orderNumber: order.folio,
      status: mapOrderStatusFromDb(order.status),
      paymentStatus: mapOrderPaymentStatusFromDb(paymentStatusRaw),
      type: order.type?.toLowerCase() || 'dine_in',
      items: (order.orderItems || []).map((item: any) => ({
        id: item.id,
        menuItemId: item.menuItemId,
        name: item.menuItem?.name || '',
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.subtotal),
        promotionId: item.promotionId || null,
        promotionNameSnapshot: item.promotionNameSnapshot || null,
        promotionTypeSnapshot: item.promotionTypeSnapshot || null,
        promotionValueSnapshot: item.promotionValueSnapshot ? Number(item.promotionValueSnapshot) : null,
        promotionQuantity: item.promotionQuantity ?? null,
        promotionAmount: item.promotionAmount ? Number(item.promotionAmount) : null,
        originalUnitPrice: item.originalUnitPrice ? Number(item.originalUnitPrice) : Number(item.unitPrice),
        effectiveUnitPrice: item.effectiveUnitPrice ? Number(item.effectiveUnitPrice) : Number(item.unitPrice),
        notes: item.notes || null,
      })),
      itemCount: (order.orderItems || []).length,
      subtotal: subtotalNum,
      promotionAmount: order.promotionAmount ? Number(order.promotionAmount) : 0,
      promotedSubtotal: order.promotedSubtotal ? Number(order.promotedSubtotal) : subtotalNum,
      discountId: order.discountId || null,
      discountAmount: discountAmountNum,
      taxableSubtotal: taxableSubtotalNum,
      appliedPromotions: (order.orderPromotions || []).map((op: any) => ({
        id: op.id,
        promotionId: op.promotionId,
        name: op.nameSnapshot,
        type: op.typeSnapshot,
        value: Number(op.valueSnapshot),
        promotionAmount: Number(op.promotionAmount),
      })),
      discount: order.discount
        ? {
            id: order.discount.id,
            name: order.discount.name,
            type: order.discount.type,
            value: Number(order.discount.value),
          }
        : null,
      tax: taxNum,
      taxRate,
      totalBeforeTip: totalBeforeTipNum,
      tipAmount: order.tipAmount ? Number(order.tipAmount) : 0,
      cashTipAmount: order.cashTipAmount ? Number(order.cashTipAmount) : 0,
      chargeableTipAmount: order.chargeableTipAmount ? Number(order.chargeableTipAmount) : 0,
      total: totalNum,
      amountDueForPayments: amountDueForPaymentsNum,
      paidAmount: Number(completedPaidAmount.toFixed(2)), // legacy compatibility
      completedPaidAmount: Number(completedPaidAmount.toFixed(2)),
      completedRefundAmount: Number(completedRefundAmount.toFixed(2)),
      netPaidAmount: Number(netPaidAmount.toFixed(2)),
      remainingAmount,
      isFullyPaid,
      tip: order.tip ? {
        method: order.tip.method,
        percentage: order.tip.percentage ? Number(order.tip.percentage) : null,
        requestedAmount: order.tip.requestedAmount ? Number(order.tip.requestedAmount) : null,
      } : null,
      paymentMethods: distinctMethods as any[],
      customerName: order.customerName || '',
      waiterName: order.user?.name || '',
      waiterId: order.user?.id || null,
      ticketPrinted: order.ticketPrinted ?? false,
      tableNumber: order.table?.number || null,
      tableId: order.table?.id || null,
      notes: order.notes || null,
      branchId: order.branchId || '',
      createdAt: order.createdAt?.toISOString(),
      updatedAt: order.updatedAt?.toISOString(),
    };
  }
}
