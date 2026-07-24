import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma-tenant';
import { ActivityLogRepository } from '../activity-log/activity-log.repository';
import { ReceiptsRepository } from './receipts.repository';
import { ReceiptValidationService } from './receipt-validation.service';
import { ReceiptNumberService } from './receipt-number.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { ListReceiptsQueryDto } from './dto/list-receipts-query.dto';

@Injectable()
export class ReceiptsService {
  private readonly logger = new Logger(ReceiptsService.name);

  constructor(
    private readonly repo: ReceiptsRepository,
    private readonly validation: ReceiptValidationService,
    private readonly numberService: ReceiptNumberService,
    private readonly activityLogRepo: ActivityLogRepository,
  ) {}

  async create(
    schemaName: string,
    dto: CreateReceiptDto,
    userId: string,
    tenantName: string,
  ) {
    if (dto.idempotencyKey) {
      const existing = await this.repo.findByIdempotencyKey(
        schemaName,
        dto.idempotencyKey,
      );
      if (existing) {
        this.validation.validateIdempotencyConflict(existing, dto.orderId);
        return this.toResponse(existing);
      }
    }

    const existingByOrder = await this.repo.findByOrder(schemaName, dto.orderId);
    if (existingByOrder) {
      return this.toResponse(existingByOrder);
    }

    try {
      return await this.repo.runTransaction(schemaName, async (tx) => {
        const order = await this.repo.findOrderForReceipt(
          schemaName,
          dto.orderId,
          tx,
        );

        this.validation.validateOrderExists(order);
        this.validation.validateOrderFullyPaid(order);

        const folio = await this.numberService.reserveFolio(schemaName, tx);

        const snapshot = this.buildSnapshot(order, folio, tenantName);

        const subtotal = new Prisma.Decimal(order.subtotal);
        const promotionAmount = new Prisma.Decimal(order.promotionAmount ?? 0);
        const discountAmount = new Prisma.Decimal(order.discountAmount ?? 0);
        const taxAmount = new Prisma.Decimal(order.tax);
        const tipAmount = new Prisma.Decimal(order.tipAmount ?? 0);
        const total = new Prisma.Decimal(order.total);

        const issuedAt = new Date();

        const receipt = await this.repo.create(
          schemaName,
          {
            order: { connect: { id: order.id } },
            folio,
            idempotencyKey: dto.idempotencyKey,
            branch: order.branchId ? { connect: { id: order.branchId } } : undefined,
            user: { connect: { id: userId } },
            subtotal,
            promotionAmount,
            discountAmount,
            taxAmount,
            tipAmount,
            total,
            snapshot: snapshot as any,
            issuedAt,
          },
          tx,
        );

        await this.activityLogRepo.create(
          schemaName,
          {
            branchId: order.branchId ?? '',
            userId,
            action: 'RECEIPT_ISSUED',
            entity: 'RECEIPT',
            entityId: receipt.id,
            changes: JSON.stringify({
              receiptId: receipt.id,
              receiptFolio: folio,
              orderId: order.id,
              orderFolio: order.folio,
              amountDueForPayments: order.amountDueForPayments
                ? new Prisma.Decimal(order.amountDueForPayments).toFixed(2)
                : new Prisma.Decimal(order.total).toFixed(2),
              total: total.toFixed(2),
              issuedAt: issuedAt.toISOString(),
            }),
          },
          tx,
        );

        return this.toResponse(receipt);
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const target = error?.meta?.target as string[] | undefined;
        if (target?.includes('order_id')) {
          const existing = await this.repo.findByOrder(schemaName, dto.orderId);
          if (existing) return this.toResponse(existing);
        }
        if (target?.includes('idempotency_key') && dto.idempotencyKey) {
          const existing = await this.repo.findByIdempotencyKey(
            schemaName,
            dto.idempotencyKey,
          );
          if (existing) {
            if (existing.orderId !== dto.orderId) {
              throw new ConflictException(
                'La clave de idempotencia ya fue utilizada con una orden diferente.',
              );
            }
            return this.toResponse(existing);
          }
        }
        throw new ConflictException(
          'Conflicto de concurrencia al crear el comprobante.',
        );
      }
      throw error;
    }
  }

  async findById(schemaName: string, id: string) {
    const receipt = await this.repo.findById(schemaName, id);
    if (!receipt) {
      throw new NotFoundException(`Comprobante con ID "${id}" no encontrado.`);
    }
    return this.toResponse(receipt);
  }

  async findByOrder(schemaName: string, orderId: string) {
    const receipt = await this.repo.findByOrder(schemaName, orderId);
    if (!receipt) {
      throw new NotFoundException(
        `No existe comprobante para la orden "${orderId}".`,
      );
    }
    return this.toResponse(receipt);
  }

  async findAll(schemaName: string, query: ListReceiptsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ReceiptWhereInput = {};

    if (query.folio) {
      where.folio = { contains: query.folio, mode: 'insensitive' };
    }
    if (query.orderId) {
      where.orderId = query.orderId;
    }
    if (query.dateFrom || query.dateTo) {
      where.issuedAt = {};
      if (query.dateFrom) where.issuedAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.issuedAt.lte = new Date(query.dateTo);
    }

    const [data, total] = await Promise.all([
      this.repo.findMany(schemaName, {
        where,
        orderBy: { issuedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.repo.count(schemaName, where),
    ]);

    return {
      data: data.map((r) => this.toResponse(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Builds an immutable snapshot of the order's financial state at issuance time.
   *
   * IMPORTANT: This method does NOT recalculate promotions, discounts, taxes, tips,
   * or totals. It copies the values already computed by the order's financial pipeline
   * (promotions engine, tax-config, tips engine, discounts engine). The snapshot is
   * a point-in-time copy; subsequent changes to the order are NOT reflected.
   *
   * All monetary values are represented as strings (via Prisma.Decimal.toFixed(2))
   * to preserve exact decimal precision.
   *
   * `Receipt.total` equals `order.total` — the consolidated amount after promotions,
   * discounts, taxes, and tips.
   */
  private buildSnapshot(order: any, folio: string, tenantName: string) {
    const issuedAt = new Date();

    const completedPayments: any[] = Array.isArray(order.payments)
      ? order.payments.filter(
          (p: any) =>
            p.status === 'COMPLETED' ||
            p.status === 'PARTIALLY_REFUNDED' ||
            p.status === 'REFUNDED',
        )
      : [];

    const paidAt =
      completedPayments.length > 0
        ? completedPayments
            .map((p: any) => p.processedAt)
            .filter(Boolean)
            .sort((a: Date, b: Date) => b.getTime() - a.getTime())[0]
            ?.toISOString() ?? null
        : null;

    return {
      receipt: {
        folio,
        issuedAt: issuedAt.toISOString(),
      },
      restaurant: {
        name: tenantName,
        branchName: order.branch?.name ?? null,
        address: order.branch?.address ?? null,
      },
      order: {
        id: order.id,
        folio: order.folio,
        customerName: order.customerName ?? null,
        createdAt: order.createdAt?.toISOString() ?? new Date(order.createdAt).toISOString(),
        paidAt,
      },
      table: {
        number: order.table?.number?.toString() ?? null,
      },
      items: (order.orderItems ?? []).map((item: any) => ({
        id: item.id,
        name: item.menuItem?.name ?? '',
        quantity: item.quantity,
        unitPrice: new Prisma.Decimal(item.unitPrice).toFixed(2),
        subtotal: new Prisma.Decimal(item.subtotal).toFixed(2),
        notes: item.notes ?? null,
      })),
      totals: {
        grossSubtotal: new Prisma.Decimal(order.subtotal).toFixed(2),
        promotionAmount: new Prisma.Decimal(order.promotionAmount ?? 0).toFixed(2),
        promotedSubtotal: new Prisma.Decimal(
          order.promotedSubtotal ?? order.subtotal,
        ).toFixed(2),
        manualDiscountAmount: new Prisma.Decimal(
          order.discountAmount ?? 0,
        ).toFixed(2),
        taxableSubtotal: new Prisma.Decimal(
          order.taxableSubtotal ?? order.subtotal,
        ).toFixed(2),
        taxAmount: new Prisma.Decimal(order.tax).toFixed(2),
        tipAmount: new Prisma.Decimal(order.tipAmount ?? 0).toFixed(2),
        amountDueForPayments: new Prisma.Decimal(
          order.amountDueForPayments ?? order.total,
        ).toFixed(2),
        total: new Prisma.Decimal(order.total).toFixed(2),
      },
      payments: (order.payments ?? []).map((p: any) => ({
        id: p.id,
        method: p.method,
        amount: new Prisma.Decimal(p.amount).toFixed(2),
        status: p.status,
        paidAt: p.processedAt?.toISOString() ?? null,
      })),
      refunds: (order.refunds ?? []).map((r: any) => ({
        id: r.id,
        amount: new Prisma.Decimal(r.amount).toFixed(2),
        status: r.status,
        createdAt: r.createdAt?.toISOString() ?? new Date(r.createdAt).toISOString(),
      })),
    };
  }

  private toResponse(receipt: any) {
    return {
      id: receipt.id,
      orderId: receipt.orderId,
      folio: receipt.folio,
      branchId: receipt.branchId ?? null,
      userId: receipt.userId ?? null,
      subtotal: new Prisma.Decimal(receipt.subtotal).toFixed(2),
      promotionAmount: new Prisma.Decimal(receipt.promotionAmount).toFixed(2),
      discountAmount: new Prisma.Decimal(receipt.discountAmount).toFixed(2),
      taxAmount: new Prisma.Decimal(receipt.taxAmount).toFixed(2),
      tipAmount: new Prisma.Decimal(receipt.tipAmount).toFixed(2),
      total: new Prisma.Decimal(receipt.total).toFixed(2),
      snapshot: receipt.snapshot,
      issuedAt: receipt.issuedAt?.toISOString() ?? new Date(receipt.issuedAt).toISOString(),
      createdAt: receipt.createdAt?.toISOString() ?? new Date(receipt.createdAt).toISOString(),
      updatedAt: receipt.updatedAt?.toISOString() ?? new Date(receipt.updatedAt).toISOString(),
    };
  }
}
