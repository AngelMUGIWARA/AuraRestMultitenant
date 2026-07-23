import { Prisma, DiscountType } from '../generated/prisma-tenant';

export class DiscountCalculator {
  /**
   * Computes the discount amount and taxable subtotal given an initial subtotal and discount rule.
   * POLICY: Result is always >= 0, discount amount never exceeds gross subtotal (total >= 0).
   * POLICY: No intermediate rounding; caller formats/rounds at final persistence step.
   */
  compute(
    subtotal: Prisma.Decimal,
    type: DiscountType,
    value: Prisma.Decimal,
    maxAmount?: Prisma.Decimal | null,
  ): { discountAmount: Prisma.Decimal; taxableSubtotal: Prisma.Decimal } {
    let raw: Prisma.Decimal;

    if (type === DiscountType.PERCENTAGE) {
      // value = 10 -> 10%
      raw = subtotal.mul(value).div(new Prisma.Decimal(100));
    } else {
      // FIXED
      raw = value;
    }

    // Apply maxAmount cap if present
    if (maxAmount && raw.greaterThan(maxAmount)) {
      raw = maxAmount;
    }

    // POLICY: discount amount never exceeds subtotal -> total >= 0
    const discountAmount = Prisma.Decimal.min(raw, subtotal);
    const taxableSubtotal = subtotal.minus(discountAmount);

    return { discountAmount, taxableSubtotal };
  }
}
