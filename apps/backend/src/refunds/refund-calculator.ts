import { Prisma } from '../generated/prisma-tenant';

export class RefundCalculator {
  static getOrderRefundableAmount(
    completedPaidAmount: Prisma.Decimal,
    completedRefundAmount: Prisma.Decimal,
  ): Prisma.Decimal {
    const amount = completedPaidAmount.minus(completedRefundAmount);
    return amount.isPositive() ? amount : new Prisma.Decimal(0);
  }

  static getPaymentRefundableAmount(
    paymentAmount: Prisma.Decimal,
    paymentRefundedAmount: Prisma.Decimal,
  ): Prisma.Decimal {
    const amount = paymentAmount.minus(paymentRefundedAmount);
    return amount.isPositive() ? amount : new Prisma.Decimal(0);
  }

  static getNetPaidAmount(
    completedPaidAmount: Prisma.Decimal,
    completedRefundAmount: Prisma.Decimal,
  ): Prisma.Decimal {
    const amount = completedPaidAmount.minus(completedRefundAmount);
    return amount.isPositive() ? amount : new Prisma.Decimal(0);
  }

  static determinePaymentStatus(
    paymentAmount: Prisma.Decimal,
    paymentRefundedAmount: Prisma.Decimal,
  ): 'COMPLETED' | 'PARTIALLY_REFUNDED' | 'REFUNDED' {
    if (paymentRefundedAmount.equals(0)) {
      return 'COMPLETED';
    }
    if (paymentRefundedAmount.greaterThanOrEqualTo(paymentAmount)) {
      return 'REFUNDED';
    }
    return 'PARTIALLY_REFUNDED';
  }
}
