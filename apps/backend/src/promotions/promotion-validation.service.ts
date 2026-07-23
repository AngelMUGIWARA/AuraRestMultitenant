import { Injectable, BadRequestException } from '@nestjs/common';
import type { OrderStatus, OrderPaymentStatus, Prisma } from '../generated/prisma-tenant';

export interface PromotionWithRelations {
  id: string;
  name: string;
  type: string;
  value: Prisma.Decimal;
  minPurchase?: Prisma.Decimal | null;
  maxAmount?: Prisma.Decimal | null;
  specialPrice?: Prisma.Decimal | null;
  buyQuantity?: number | null;
  getQuantity?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  startMinute?: number | null;
  endMinute?: number | null;
  priority: number;
  isActive: boolean;
  branchId?: string | null;
  promotionCategories?: Array<{ categoryId: string }>;
  promotionItems?: Array<{ menuItemId: string; isTarget: boolean }>;
}

@Injectable()
export class PromotionValidationService {
  /**
   * Validates if a promotion can be applied to an order.
   * Throws BadRequestException if invalid, or returns boolean for silent filtering.
   */
  validate(
    promotion: PromotionWithRelations,
    order: {
      status: OrderStatus;
      paymentStatus: OrderPaymentStatus;
      subtotal: Prisma.Decimal;
      branchId?: string | null;
    },
    now: Date = new Date(),
    timezone = 'America/Mexico_City',
  ): void {
    // 1. Must be active
    if (!promotion.isActive) {
      throw new BadRequestException(`La promoción "${promotion.name}" está inactiva.`);
    }

    // 2. Date window check
    if (promotion.startsAt && now < promotion.startsAt) {
      throw new BadRequestException(`La promoción "${promotion.name}" aún no está vigente.`);
    }
    if (promotion.endsAt && now > promotion.endsAt) {
      throw new BadRequestException(`La promoción "${promotion.name}" ha expirado.`);
    }

    // 3. Time of day check (startMinute / endMinute using local timezone)
    if (promotion.startMinute !== undefined && promotion.startMinute !== null &&
        promotion.endMinute !== undefined && promotion.endMinute !== null) {
      const currentLocalMinute = this.getLocalMinutesFromDate(now, timezone);
      const { startMinute, endMinute } = promotion;

      let isTimeActive = false;
      if (startMinute <= endMinute) {
        // Normal range (e.g. 08:00 to 16:00 -> 480 to 960)
        isTimeActive = currentLocalMinute >= startMinute && currentLocalMinute <= endMinute;
      } else {
        // Night shift range (e.g. 22:00 to 02:00 -> 1320 to 120)
        isTimeActive = currentLocalMinute >= startMinute || currentLocalMinute <= endMinute;
      }

      if (!isTimeActive) {
        throw new BadRequestException(`La promoción "${promotion.name}" no está disponible en este horario.`);
      }
    }

    // 4. Branch restriction check
    if (promotion.branchId && order.branchId && promotion.branchId !== order.branchId) {
      throw new BadRequestException(`La promoción "${promotion.name}" no aplica para esta sucursal.`);
    }

    // 5. Minimum purchase check
    if (promotion.minPurchase && order.subtotal.lessThan(promotion.minPurchase)) {
      throw new BadRequestException(
        `El subtotal mínimo para la promoción "${promotion.name}" es $${promotion.minPurchase.toFixed(2)}.`,
      );
    }

    // 6. Order status check
    const ALLOWED_ORDER_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED'];
    if (!ALLOWED_ORDER_STATUSES.includes(order.status)) {
      throw new BadRequestException(
        `No se pueden modificar promociones en una orden en estado "${order.status}".`,
      );
    }

    // 7. Payment status check
    if (order.paymentStatus !== 'UNPAID') {
      throw new BadRequestException(
        'No se pueden modificar promociones en una orden con pagos registrados.',
      );
    }
  }

  /**
   * Helper to convert a Date object into local minutes from midnight in the target timezone.
   */
  public getLocalMinutesFromDate(date: Date, timeZone: string): number {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      });
      const parts = formatter.formatToParts(date);
      let hour = 0;
      let minute = 0;
      for (const part of parts) {
        if (part.type === 'hour') hour = parseInt(part.value, 10) % 24;
        if (part.type === 'minute') minute = parseInt(part.value, 10);
      }
      return hour * 60 + minute;
    } catch {
      // Fallback to UTC if timezone parsing fails
      return date.getUTCHours() * 60 + date.getUTCMinutes();
    }
  }
}
