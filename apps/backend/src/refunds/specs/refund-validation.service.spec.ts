import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma-tenant';
import { RefundValidationService } from '../refund-validation.service';

describe('RefundValidationService', () => {
  let service: RefundValidationService;

  beforeEach(() => {
    service = new RefundValidationService();
  });

  describe('validateRefundAmount', () => {
    it('should throw if amount is zero or negative', () => {
      expect(() =>
        service.validateRefundAmount(
          new Prisma.Decimal('0'),
          new Prisma.Decimal('100'),
          new Prisma.Decimal('0')
        )
      ).toThrow(BadRequestException);

      expect(() =>
        service.validateRefundAmount(
          new Prisma.Decimal('-10'),
          new Prisma.Decimal('100'),
          new Prisma.Decimal('0')
        )
      ).toThrow(BadRequestException);
    });

    it('should throw if amount exceeds refundable amount', () => {
      expect(() =>
        service.validateRefundAmount(
          new Prisma.Decimal('50'),
          new Prisma.Decimal('100'),
          new Prisma.Decimal('60')
        )
      ).toThrow(BadRequestException);
    });

    it('should not throw if amount is valid', () => {
      expect(() =>
        service.validateRefundAmount(
          new Prisma.Decimal('40'),
          new Prisma.Decimal('100'),
          new Prisma.Decimal('60')
        )
      ).not.toThrow();
    });
  });

  describe('validatePaymentStatus', () => {
    it('should throw if status is not COMPLETED or PARTIALLY_REFUNDED', () => {
      expect(() => service.validatePaymentStatus('PENDING')).toThrow(BadRequestException);
      expect(() => service.validatePaymentStatus('REFUNDED')).toThrow(BadRequestException);
      expect(() => service.validatePaymentStatus('FAILED')).toThrow(BadRequestException);
    });

    it('should not throw if status is valid', () => {
      expect(() => service.validatePaymentStatus('COMPLETED')).not.toThrow();
      expect(() => service.validatePaymentStatus('PARTIALLY_REFUNDED')).not.toThrow();
    });
  });
});
