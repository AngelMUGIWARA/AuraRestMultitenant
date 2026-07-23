import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma-tenant';
import { DiscountsRepository } from './discounts.repository';
import { DiscountValidationService } from './discount-validation.service';
import { DiscountCalculator } from './discount.calculator';
import { OrdersRepository } from '../orders/orders.repository';
import { TaxConfigService } from '../tax-config/tax-config.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { EventBusService } from '../event-bus/event-bus.service';

@Injectable()
export class OrderDiscountService {
  constructor(
    private readonly discountsRepo: DiscountsRepository,
    private readonly ordersRepo: OrdersRepository,
    private readonly taxConfigService: TaxConfigService,
    private readonly validator: DiscountValidationService,
    private readonly calculator: DiscountCalculator,
    private readonly activityLog: ActivityLogService,
    private readonly eventBus: EventBusService,
  ) {}

  async apply(schemaName: string, orderId: string, discountId: string, userId?: string) {
    return this.ordersRepo.runTransaction(schemaName, async (tx) => {
      const order = await this.ordersRepo.findById(schemaName, orderId, tx);
      if (!order) {
        throw new NotFoundException('Orden no encontrada');
      }

      const discount = await this.discountsRepo.findById(schemaName, discountId, tx);
      if (!discount) {
        throw new NotFoundException('Descuento no encontrado');
      }

      // Check payments to compute paymentStatus
      const completedPayments = (order.payments || []).filter((p) => p.status === 'COMPLETED');
      const paidAmountSum = completedPayments.reduce(
        (sum, p) => sum.plus(new Prisma.Decimal(p.amount)),
        new Prisma.Decimal(0),
      );

      const isFullyPaid = paidAmountSum.greaterThanOrEqualTo(order.total);
      const computedPaymentStatus = (order.paymentStatus && order.paymentStatus !== 'UNPAID')
        ? order.paymentStatus
        : (isFullyPaid ? 'PAID' : paidAmountSum.greaterThan(0) ? 'PARTIALLY_PAID' : 'UNPAID');

      // 1. Validate applicability
      this.validator.validate(discount, {
        status: order.status,
        paymentStatus: computedPaymentStatus,
        subtotal: order.subtotal,
        branchId: order.branchId,
      });

      // 2. Compute discount amounts
      const { discountAmount, taxableSubtotal } = this.calculator.compute(
        order.subtotal,
        discount.type,
        discount.value,
        discount.maxAmount,
      );

      // 3. Tax calculation on taxable base
      const taxRate = await this.taxConfigService.getTaxRate(schemaName, order.branchId ?? undefined);
      const taxRateDec = new Prisma.Decimal(taxRate);
      const tax = taxableSubtotal.mul(taxRateDec);
      const total = taxableSubtotal.plus(tax);

      // 4. Update order atomically with optimistic locking
      try {
        const updatedOrder = await this.ordersRepo.updateWithVersion(
          schemaName,
          order.id,
          order.version,
          {
            discount: { connect: { id: discount.id } },
            discountAmount,
            taxableSubtotal,
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
              action: 'ORDER_DISCOUNT_APPLIED',
              entity: 'Order',
              entityId: order.id,
              changes: JSON.stringify({
                discountId: discount.id,
                discountName: discount.name,
                discountAmount: discountAmount.toString(),
                taxableSubtotal: taxableSubtotal.toString(),
                total: total.toString(),
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

  async remove(schemaName: string, orderId: string, userId?: string) {
    return this.ordersRepo.runTransaction(schemaName, async (tx) => {
      const order = await this.ordersRepo.findById(schemaName, orderId, tx);
      if (!order) {
        throw new NotFoundException('Orden no encontrada');
      }

      if (!order.discountId) {
        return order; // No-op if no discount applied
      }

      // Check payments to compute paymentStatus
      const completedPayments = (order.payments || []).filter((p) => p.status === 'COMPLETED');
      const paidAmountSum = completedPayments.reduce(
        (sum, p) => sum.plus(new Prisma.Decimal(p.amount)),
        new Prisma.Decimal(0),
      );

      const isFullyPaid = paidAmountSum.greaterThanOrEqualTo(order.total);
      const computedPaymentStatus = (order.paymentStatus && order.paymentStatus !== 'UNPAID')
        ? order.paymentStatus
        : (isFullyPaid ? 'PAID' : paidAmountSum.greaterThan(0) ? 'PARTIALLY_PAID' : 'UNPAID');

      if (['IN_PROGRESS', 'READY', 'DELIVERED', 'PAID', 'CANCELLED'].includes(order.status)) {
        throw new BadRequestException(
          `No se puede modificar el descuento de una orden en estado "${order.status}".`,
        );
      }

      if (computedPaymentStatus !== 'UNPAID') {
        throw new BadRequestException(
          'No se puede modificar el descuento de una orden con pagos registrados.',
        );
      }

      // Recalculate without discount
      const taxRate = await this.taxConfigService.getTaxRate(schemaName, order.branchId ?? undefined);
      const taxRateDec = new Prisma.Decimal(taxRate);
      const tax = order.subtotal.mul(taxRateDec);
      const total = order.subtotal.plus(tax);

      try {
        const updatedOrder = await this.ordersRepo.updateWithVersion(
          schemaName,
          order.id,
          order.version,
          {
            discount: { disconnect: true },
            discountAmount: null,
            taxableSubtotal: null,
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
              action: 'ORDER_DISCOUNT_REMOVED',
              entity: 'Order',
              entityId: order.id,
              changes: JSON.stringify({
                previousDiscountId: order.discountId,
                total: total.toString(),
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
    const computedPaymentStatus = order.paymentStatus ?? (isFullyPaid ? 'PAID' : paidAmountSum.greaterThan(0) ? 'PARTIALLY_PAID' : 'UNPAID');

    if (computedPaymentStatus !== 'UNPAID') {
      return [];
    }

    const activeDiscounts = await this.discountsRepo.findActive(
      schemaName,
      new Date(),
      order.branchId ?? undefined,
    );

    return activeDiscounts.filter((d) => {
      try {
        this.validator.validate(d, {
          status: order.status,
          paymentStatus: computedPaymentStatus,
          subtotal: order.subtotal,
          branchId: order.branchId,
        });
        return true;
      } catch {
        return false;
      }
    });
  }
}
