import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma-tenant';
import { PromotionsRepository } from './promotions.repository';
import { PromotionValidationService } from './promotion-validation.service';
import { PromotionCalculator } from './promotion.calculator';
import { PromotionResolver } from './promotion.resolver';
import { OrdersRepository } from '../orders/orders.repository';
import { TaxConfigService } from '../tax-config/tax-config.service';
import { DiscountCalculator } from '../discounts/discount.calculator';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { EventBusService } from '../event-bus/event-bus.service';

@Injectable()
export class OrderPromotionService {
  constructor(
    private readonly promotionsRepo: PromotionsRepository,
    private readonly ordersRepo: OrdersRepository,
    private readonly taxConfigService: TaxConfigService,
    private readonly validator: PromotionValidationService,
    private readonly calculator: PromotionCalculator,
    private readonly resolver: PromotionResolver,
    private readonly discountCalculator: DiscountCalculator,
    private readonly activityLog: ActivityLogService,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Recalculates and persists promotions for an order atomically with optimistic locking.
   * Enforces mathematical invariant: Order.promotionAmount == sum(OrderItem.promotionAmount) == sum(OrderPromotion.promotionAmount).
   */
  async recalculate(schemaName: string, orderId: string, userId?: string) {
    return this.ordersRepo.runTransaction(schemaName, async (tx) => {
      const order = await this.ordersRepo.findById(schemaName, orderId, tx);
      if (!order) {
        throw new NotFoundException('Orden no encontrada');
      }

      // Check payment status and operational status
      const completedPayments = (order.payments || []).filter((p) => p.status === 'COMPLETED');
      const paidAmountSum = completedPayments.reduce(
        (sum, p) => sum.plus(new Prisma.Decimal(p.amount)),
        new Prisma.Decimal(0),
      );

      const isFullyPaid = paidAmountSum.greaterThanOrEqualTo(order.total);
      const computedPaymentStatus = (order.paymentStatus && order.paymentStatus !== 'UNPAID')
        ? order.paymentStatus
        : (isFullyPaid ? 'PAID' : paidAmountSum.greaterThan(0) ? 'PARTIALLY_PAID' : 'UNPAID');

      const ALLOWED_ORDER_STATUSES = ['PENDING', 'CONFIRMED'];
      if (!ALLOWED_ORDER_STATUSES.includes(order.status) || computedPaymentStatus !== 'UNPAID') {
        // Ineligible for promotion recalculation: return order as-is
        return order;
      }

      // Fetch active promotions
      const activePromotions = await this.promotionsRepo.findActiveWithRelations(
        schemaName,
        new Date(),
        order.branchId ?? undefined,
        tx,
      );

      // Filter promotions through validator
      const validPromotions = activePromotions.filter((p) => {
        try {
          this.validator.validate(
            p as any,
            {
              status: order.status,
              paymentStatus: computedPaymentStatus,
              subtotal: order.subtotal,
              branchId: order.branchId,
            },
            new Date(),
          );
          return true;
        } catch {
          return false;
        }
      });

      // Map order items for calculation
      const itemCalculationInputs = (order.orderItems || []).map((item) => ({
        id: item.id,
        menuItemId: item.menuItemId,
        categoryId: item.menuItem?.categoryId || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      }));

      // Resolve best promotions without item overlap
      const resolved = this.resolver.resolveBestPromotions(
        validPromotions as any,
        itemCalculationInputs,
      );

      // Calculate gross subtotal = sum(item.subtotal)
      const grossSubtotal = itemCalculationInputs.reduce(
        (sum, i) => sum.plus(i.subtotal),
        new Prisma.Decimal(0),
      );

      const promotionAmount = resolved.totalPromotionAmount;
      const promotedSubtotal = grossSubtotal.minus(promotionAmount);

      // Recalculate manual discount over promotedSubtotal if present
      let manualDiscountAmount = new Prisma.Decimal(0);
      if (order.discount) {
        const manualDiscountResult = this.discountCalculator.compute(
          promotedSubtotal,
          order.discount.type,
          order.discount.value,
          order.discount.maxAmount,
        );
        manualDiscountAmount = manualDiscountResult.discountAmount;
      }

      const taxableSubtotal = promotedSubtotal.minus(manualDiscountAmount);

      // Tax calculation over taxableSubtotal
      const taxRate = await this.taxConfigService.getTaxRate(
        schemaName,
        order.branchId ?? undefined,
      );
      const taxRateDec = new Prisma.Decimal(taxRate);
      const tax = taxableSubtotal.mul(taxRateDec);
      const total = taxableSubtotal.plus(tax);

      // ── Verify Invariant ──────────────────────────────────────────────────
      const sumOrderItemPromotions = Array.from(resolved.lineBenefits.values()).reduce(
        (sum, b) => sum.plus(b.promotionAmount),
        new Prisma.Decimal(0),
      );

      const sumOrderPromotions = resolved.appliedPromotionsSummary.reduce(
        (sum, p) => sum.plus(p.promotionAmount),
        new Prisma.Decimal(0),
      );

      if (
        !promotionAmount.equals(sumOrderItemPromotions) ||
        !promotionAmount.equals(sumOrderPromotions)
      ) {
        throw new Error(
          `Financial invariant check failed: order.promotionAmount (${promotionAmount}) != sum(orderItem.promotionAmount) (${sumOrderItemPromotions}) != sum(orderPromotion.promotionAmount) (${sumOrderPromotions})`,
        );
      }

      // Execute update with optimistic locking (version increment)
      try {
        // 1. Delete old OrderPromotion entries for this order
        await this.promotionsRepo.deleteOrderPromotions(schemaName, order.id, tx);

        // 2. Insert new OrderPromotion entries
        for (const promoSummary of resolved.appliedPromotionsSummary) {
          await this.promotionsRepo.createOrderPromotion(
            schemaName,
            {
              order: { connect: { id: order.id } },
              promotion: { connect: { id: promoSummary.promotionId } },
              nameSnapshot: promoSummary.name,
              typeSnapshot: promoSummary.type,
              valueSnapshot: promoSummary.value,
              promotionAmount: promoSummary.promotionAmount,
            },
            tx,
          );
        }

        // 3. Update OrderItem snapshots
        for (const item of order.orderItems) {
          const benefit = resolved.lineBenefits.get(item.id);
          if (benefit) {
            await this.ordersRepo.updateOrderItem(
              schemaName,
              item.id,
              {
                promotion: { connect: { id: benefit.promotionId } },
                promotionNameSnapshot: benefit.promotionName,
                promotionTypeSnapshot: benefit.promotionType,
                promotionValueSnapshot: benefit.promotionValue,
                promotionQuantity: benefit.benefitedQuantity,
                promotionAmount: benefit.promotionAmount,
                originalUnitPrice: item.unitPrice,
                effectiveUnitPrice: benefit.effectiveUnitPrice,
              },
              tx,
            );
          } else {
            await this.ordersRepo.updateOrderItem(
              schemaName,
              item.id,
              {
                promotion: { disconnect: true },
                promotionNameSnapshot: null,
                promotionTypeSnapshot: null,
                promotionValueSnapshot: null,
                promotionQuantity: null,
                promotionAmount: null,
                originalUnitPrice: item.unitPrice,
                effectiveUnitPrice: item.unitPrice,
              },
              tx,
            );
          }
        }

        // 4. Update Order financials and increment version
        const updatedOrder = await this.ordersRepo.updateWithVersion(
          schemaName,
          order.id,
          order.version,
          {
            subtotal: grossSubtotal,
            promotionAmount: promotionAmount.greaterThan(0) ? promotionAmount : null,
            promotedSubtotal: promotionAmount.greaterThan(0) ? promotedSubtotal : null,
            discountAmount: manualDiscountAmount.greaterThan(0) ? manualDiscountAmount : null,
            taxableSubtotal: manualDiscountAmount.greaterThan(0) ? taxableSubtotal : null,
            tax,
            total,
          },
          tx,
        );

        if (userId) {
          await this.activityLog.log(
            schemaName,
            {
              branchId: order.branchId || '',
              userId,
              action: 'ORDER_PROMOTIONS_RECALCULATED',
              entity: 'Order',
              entityId: order.id,
              changes: JSON.stringify({
                promotionAmount: promotionAmount.toString(),
                promotedSubtotal: promotedSubtotal.toString(),
                total: total.toString(),
                appliedPromotionsCount: resolved.appliedPromotionsSummary.length,
              }),
            },
            tx,
          );
        }

        this.eventBus.emit('order:updated', {
          schemaName,
          orderId: order.id,
          tenantSlug: schemaName,
        });

        return updatedOrder;
      } catch (error: any) {
        if (error.code === 'P2025') {
          throw new ConflictException(
            'La orden fue modificada por otro usuario. Por favor recarga e intenta de nuevo.',
          );
        }
        throw error;
      }
    });
  }

  async getAvailable(schemaName: string, orderId: string) {
    const order = await this.ordersRepo.findById(schemaName, orderId);
    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    const ALLOWED_ORDER_STATUSES = ['PENDING', 'CONFIRMED'];
    if (!ALLOWED_ORDER_STATUSES.includes(order.status)) {
      return [];
    }

    const completedPayments = (order.payments || []).filter((p) => p.status === 'COMPLETED');
    const paidAmountSum = completedPayments.reduce(
      (sum, p) => sum.plus(new Prisma.Decimal(p.amount)),
      new Prisma.Decimal(0),
    );
    const isFullyPaid = paidAmountSum.greaterThanOrEqualTo(order.total);
    const computedPaymentStatus = (order.paymentStatus && order.paymentStatus !== 'UNPAID')
      ? order.paymentStatus
      : (isFullyPaid ? 'PAID' : paidAmountSum.greaterThan(0) ? 'PARTIALLY_PAID' : 'UNPAID');

    if (computedPaymentStatus !== 'UNPAID') {
      return [];
    }

    const activePromotions = await this.promotionsRepo.findActiveWithRelations(
      schemaName,
      new Date(),
      order.branchId ?? undefined,
    );

    return activePromotions.filter((p) => {
      try {
        this.validator.validate(
          p as any,
          {
            status: order.status,
            paymentStatus: computedPaymentStatus,
            subtotal: order.subtotal,
            branchId: order.branchId,
          },
          new Date(),
        );
        return true;
      } catch {
        return false;
      }
    });
  }
}
