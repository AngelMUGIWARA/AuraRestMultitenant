import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma-tenant';
import { ReceiptValidationService } from '../receipt-validation.service';

describe('ReceiptValidationService', () => {
  let service: ReceiptValidationService;

  beforeEach(() => {
    service = new ReceiptValidationService();
  });

  describe('validateOrderExists', () => {
    it('should throw BadRequestException if order is null', () => {
      expect(() => service.validateOrderExists(null)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException if order is undefined', () => {
      expect(() => service.validateOrderExists(undefined)).toThrow(BadRequestException);
    });

    it('should not throw if order exists', () => {
      expect(() => service.validateOrderExists({ id: 'order-1' })).not.toThrow();
    });
  });

  describe('validateOrderFullyPaid', () => {
    it('should throw if completedPaidAmount < amountDueForPayments', () => {
      const order = {
        total: new Prisma.Decimal('100'),
        amountDueForPayments: new Prisma.Decimal('100'),
        payments: [
          { amount: new Prisma.Decimal('50'), status: 'COMPLETED' },
        ],
      };
      expect(() => service.validateOrderFullyPaid(order)).toThrow(BadRequestException);
    });

    it('should not throw if completedPaidAmount >= amountDueForPayments', () => {
      const order = {
        total: new Prisma.Decimal('100'),
        amountDueForPayments: new Prisma.Decimal('100'),
        payments: [
          { amount: new Prisma.Decimal('100'), status: 'COMPLETED' },
        ],
      };
      expect(() => service.validateOrderFullyPaid(order)).not.toThrow();
    });

    it('should not throw if paid more than amountDueForPayments (overpayment)', () => {
      const order = {
        total: new Prisma.Decimal('100'),
        amountDueForPayments: new Prisma.Decimal('100'),
        payments: [
          { amount: new Prisma.Decimal('120'), status: 'COMPLETED' },
        ],
      };
      expect(() => service.validateOrderFullyPaid(order)).not.toThrow();
    });

    it('should count PARTIALLY_REFUNDED payments as paid', () => {
      const order = {
        total: new Prisma.Decimal('100'),
        amountDueForPayments: new Prisma.Decimal('100'),
        payments: [
          { amount: new Prisma.Decimal('100'), status: 'PARTIALLY_REFUNDED' },
        ],
      };
      expect(() => service.validateOrderFullyPaid(order)).not.toThrow();
    });

    it('should count REFUNDED payments as paid', () => {
      const order = {
        total: new Prisma.Decimal('100'),
        amountDueForPayments: new Prisma.Decimal('100'),
        payments: [
          { amount: new Prisma.Decimal('100'), status: 'REFUNDED' },
        ],
      };
      expect(() => service.validateOrderFullyPaid(order)).not.toThrow();
    });

    it('should NOT consider refunds as reopening operational debt', () => {
      const order = {
        total: new Prisma.Decimal('1000'),
        amountDueForPayments: new Prisma.Decimal('1000'),
        payments: [
          { amount: new Prisma.Decimal('1000'), status: 'PARTIALLY_REFUNDED' },
        ],
        refunds: [
          { amount: new Prisma.Decimal('300'), status: 'COMPLETED' },
        ],
      };
      expect(() => service.validateOrderFullyPaid(order)).not.toThrow();
    });

    it('should fallback to order.total if amountDueForPayments is null', () => {
      const order = {
        total: new Prisma.Decimal('100'),
        amountDueForPayments: null,
        payments: [
          { amount: new Prisma.Decimal('100'), status: 'COMPLETED' },
        ],
      };
      expect(() => service.validateOrderFullyPaid(order)).not.toThrow();
    });

    it('should throw if no payments and amountDueForPayments > 0', () => {
      const order = {
        total: new Prisma.Decimal('100'),
        amountDueForPayments: new Prisma.Decimal('100'),
        payments: [],
      };
      expect(() => service.validateOrderFullyPaid(order)).toThrow(BadRequestException);
    });

    it('should handle empty payments array as zero paid', () => {
      const order = {
        total: new Prisma.Decimal('0'),
        amountDueForPayments: new Prisma.Decimal('0'),
        payments: [],
      };
      expect(() => service.validateOrderFullyPaid(order)).not.toThrow();
    });
  });

  describe('validateIdempotencyConflict', () => {
    it('should throw if existing receipt has different orderId', () => {
      expect(() =>
        service.validateIdempotencyConflict(
          { orderId: 'order-1' },
          'order-2',
        ),
      ).toThrow(BadRequestException);
    });

    it('should not throw if existing receipt has same orderId', () => {
      expect(() =>
        service.validateIdempotencyConflict(
          { orderId: 'order-1' },
          'order-1',
        ),
      ).not.toThrow();
    });

    it('should not throw if existingReceipt is null', () => {
      expect(() =>
        service.validateIdempotencyConflict(null, 'order-1'),
      ).not.toThrow();
    });
  });
});
