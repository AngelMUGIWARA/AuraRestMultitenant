import { Injectable, BadRequestException } from '@nestjs/common';
import type { Discount, OrderStatus, OrderPaymentStatus, Prisma } from '../generated/prisma-tenant';

@Injectable()
export class DiscountValidationService {
  /**
   * Validates if a discount can be applied to a specific order.
   * Throws BadRequestException if any business rule fails.
   */
  validate(
    discount: Discount,
    order: {
      status: OrderStatus;
      paymentStatus: OrderPaymentStatus;
      subtotal: Prisma.Decimal;
      branchId?: string | null;
    },
    now: Date = new Date(),
  ): void {
    // 1. Discount must be active
    if (!discount.isActive) {
      throw new BadRequestException('El descuento está inactivo.');
    }

    // 2. Date validity window
    if (discount.startsAt && now < discount.startsAt) {
      throw new BadRequestException('El descuento aún no está vigente.');
    }
    if (discount.endsAt && now > discount.endsAt) {
      throw new BadRequestException('El descuento ha expirado.');
    }

    // 3. Operational kitchen state check
    const ALLOWED_ORDER_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED'];
    if (!ALLOWED_ORDER_STATUSES.includes(order.status)) {
      throw new BadRequestException(
        `No se puede modificar el descuento de una orden en estado "${order.status}". Solo se permite en PENDING o CONFIRMED.`,
      );
    }

    // 4. Financial payment status check
    if (order.paymentStatus !== 'UNPAID') {
      throw new BadRequestException(
        'No se puede modificar el descuento de una orden con pagos registrados.',
      );
    }

    // 5. Branch restriction check
    if (discount.branchId && order.branchId && discount.branchId !== order.branchId) {
      throw new BadRequestException('El descuento no aplica para esta sucursal.');
    }

    // 6. Minimum purchase check
    if (discount.minPurchase && order.subtotal.lessThan(discount.minPurchase)) {
      throw new BadRequestException(
        `El subtotal mínimo para este descuento es ${discount.minPurchase.toFixed(2)}.`,
      );
    }
  }
}
