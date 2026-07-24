import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma-tenant';

@Injectable()
export class ReceiptValidationService {
  validateOrderExists(order: any): void {
    if (!order) {
      throw new BadRequestException('La orden no existe.');
    }
  }

  validateOrderFullyPaid(order: any): void {
    const completedPayments: any[] = Array.isArray(order.payments)
      ? order.payments.filter(
          (p: any) =>
            p.status === 'COMPLETED' ||
            p.status === 'PARTIALLY_REFUNDED' ||
            p.status === 'REFUNDED',
        )
      : [];

    const completedPaidAmount = completedPayments.reduce(
      (sum: Prisma.Decimal, p: any) => sum.plus(new Prisma.Decimal(p.amount)),
      new Prisma.Decimal(0),
    );

    const amountDueForPayments = order.amountDueForPayments
      ? new Prisma.Decimal(order.amountDueForPayments)
      : new Prisma.Decimal(order.total);

    if (completedPaidAmount.lessThan(amountDueForPayments)) {
      throw new BadRequestException(
        `La orden no está liquidada. Pagado: ${completedPaidAmount.toFixed(2)}, ` +
          `Pendiente: ${amountDueForPayments.minus(completedPaidAmount).toFixed(2)}.`,
      );
    }
  }

  validateIdempotencyConflict(
    existingReceipt: any,
    requestedOrderId: string,
  ): void {
    if (existingReceipt && existingReceipt.orderId !== requestedOrderId) {
      throw new BadRequestException(
        'La clave de idempotencia ya fue utilizada con una orden diferente.',
      );
    }
  }
}
