import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma-tenant';
import { RefundsService } from '../refunds.service';
import { RefundsRepository } from '../refunds.repository';
import { RefundValidationService } from '../refund-validation.service';
import { ActivityLogService } from '../../activity-log/activity-log.service';

describe('RefundsService', () => {
  let service: RefundsService;
  let repo: any;
  let validation: any;
  let activityLog: any;

  beforeEach(() => {
    repo = {
      findRefundByIdempotencyKey: jest.fn(),
      findOrderById: jest.fn(),
      findPaymentById: jest.fn(),
      updateOrderVersion: jest.fn(),
      createRefund: jest.fn(),
      updatePaymentStatus: jest.fn(),
      runTransaction: jest.fn().mockImplementation((_s, cb) => cb({})),
    };
    validation = {
      validateRefundAmount: jest.fn(),
      validatePaymentStatus: jest.fn(),
    };
    activityLog = { log: jest.fn() };

    service = new RefundsService(repo, validation, activityLog);
  });

  describe('createRefund', () => {
    const dto = {
      amount: 50,
      reason: 'test',
      idempotencyKey: 'key-1',
      expectedVersion: 1,
    };

    it('should return existing refund if idempotency key matches perfectly', async () => {
      repo.findRefundByIdempotencyKey.mockResolvedValue({
        id: 'refund-1',
        orderId: 'order-1',
        paymentId: 'pay-1',
        amount: new Prisma.Decimal('50'),
      });
      repo.findOrderById.mockResolvedValue({ status: 'PAID', version: 1 });

      const result = await service.createRefund('tenant', 'order-1', 'pay-1', dto);
      expect(result.id).toBe('refund-1');
    });

    it('should throw ConflictException if idempotency key matches with different params', async () => {
      repo.findRefundByIdempotencyKey.mockResolvedValue({
        id: 'refund-1',
        orderId: 'order-1',
        paymentId: 'pay-1',
        amount: new Prisma.Decimal('100'),
      });

      await expect(
        service.createRefund('tenant', 'order-1', 'pay-1', dto)
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequest if order not found', async () => {
      repo.findOrderById.mockResolvedValue(null);
      await expect(service.createRefund('tenant', 'order-1', 'pay-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequest if payment not found', async () => {
      repo.findOrderById.mockResolvedValue({ id: 'order-1' });
      repo.findPaymentById.mockResolvedValue(null);
      await expect(service.createRefund('tenant', 'order-1', 'pay-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequest if payment does not belong to order', async () => {
      repo.findOrderById.mockResolvedValue({ id: 'order-1' });
      repo.findPaymentById.mockResolvedValue({ id: 'pay-1', orderId: 'order-2' });
      await expect(service.createRefund('tenant', 'order-1', 'pay-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should successfully create refund and update statuses', async () => {
      repo.findOrderById.mockResolvedValueOnce({ id: 'order-1', branchId: 'b1' });
      repo.findOrderById.mockResolvedValueOnce({ 
        id: 'order-1', 
        branchId: 'b1',
        payments: [{ id: 'pay-1', amount: new Prisma.Decimal('100'), status: 'PARTIALLY_REFUNDED', refunds: [{ status: 'COMPLETED', amount: new Prisma.Decimal('50') }] }]
      });
      repo.findPaymentById.mockResolvedValue({
        id: 'pay-1',
        orderId: 'order-1',
        status: 'COMPLETED',
        amount: new Prisma.Decimal('100'),
        refunds: [],
      });
      repo.updateOrderVersion.mockResolvedValue({ id: 'order-1', branchId: 'b1' });
      repo.createRefund.mockResolvedValue({
        id: 'refund-1',
        paymentId: 'pay-1',
        orderId: 'order-1',
        amount: new Prisma.Decimal('50'),
        status: 'COMPLETED',
      });
      repo.updatePaymentStatus.mockResolvedValue({ id: 'pay-1', status: 'PARTIALLY_REFUNDED' });

      const res = await service.createRefund('tenant', 'order-1', 'pay-1', dto, 'user-1');

      expect(validation.validatePaymentStatus).toHaveBeenCalledWith('COMPLETED');
      expect(validation.validateRefundAmount).toHaveBeenCalled();
      expect(repo.updateOrderVersion).toHaveBeenCalledWith('tenant', 'order-1', 1, expect.any(Object));
      expect(repo.createRefund).toHaveBeenCalled();
      expect(repo.updatePaymentStatus).toHaveBeenCalledWith('tenant', 'pay-1', 'PARTIALLY_REFUNDED', expect.any(Object));
      expect(activityLog.log).toHaveBeenCalled();
      expect(res.id).toBe('refund-1');
      expect(res.paymentStatus).toBe('PARTIALLY_REFUNDED');
    });
  });
});
