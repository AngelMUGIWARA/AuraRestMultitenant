import { Prisma } from '../../generated/prisma-tenant';
import { RefundCalculator } from '../refund-calculator';

describe('RefundCalculator', () => {
  it('should calculate order refundable amount correctly', () => {
    const paid = new Prisma.Decimal('100.50');
    const refunded = new Prisma.Decimal('20.00');
    
    const result = RefundCalculator.getOrderRefundableAmount(paid, refunded);
    expect(result.toString()).toBe('80.5');
  });

  it('should not return negative order refundable amount', () => {
    const paid = new Prisma.Decimal('100.00');
    const refunded = new Prisma.Decimal('150.00');
    
    const result = RefundCalculator.getOrderRefundableAmount(paid, refunded);
    expect(result.toString()).toBe('0');
  });

  it('should calculate payment refundable amount correctly', () => {
    const amount = new Prisma.Decimal('50.00');
    const refunded = new Prisma.Decimal('25.00');
    
    const result = RefundCalculator.getPaymentRefundableAmount(amount, refunded);
    expect(result.toString()).toBe('25');
  });

  it('should calculate net paid amount correctly', () => {
    const paid = new Prisma.Decimal('200.00');
    const refunded = new Prisma.Decimal('50.00');
    
    const result = RefundCalculator.getNetPaidAmount(paid, refunded);
    expect(result.toString()).toBe('150');
  });

  it('determinePaymentStatus should return COMPLETED when refunded is 0', () => {
    const status = RefundCalculator.determinePaymentStatus(
      new Prisma.Decimal('100'),
      new Prisma.Decimal('0')
    );
    expect(status).toBe('COMPLETED');
  });

  it('determinePaymentStatus should return PARTIALLY_REFUNDED when refunded < amount', () => {
    const status = RefundCalculator.determinePaymentStatus(
      new Prisma.Decimal('100'),
      new Prisma.Decimal('99.99')
    );
    expect(status).toBe('PARTIALLY_REFUNDED');
  });

  it('determinePaymentStatus should return REFUNDED when refunded == amount', () => {
    const status = RefundCalculator.determinePaymentStatus(
      new Prisma.Decimal('100'),
      new Prisma.Decimal('100')
    );
    expect(status).toBe('REFUNDED');
  });

  it('determinePaymentStatus should return REFUNDED when refunded > amount', () => {
    const status = RefundCalculator.determinePaymentStatus(
      new Prisma.Decimal('100'),
      new Prisma.Decimal('150')
    );
    expect(status).toBe('REFUNDED');
  });
});
