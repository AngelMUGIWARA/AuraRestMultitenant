import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, DiscountType, OrderStatus, OrderPaymentStatus } from '../generated/prisma-tenant';
import { DiscountCalculator } from './discount.calculator';
import { DiscountValidationService } from './discount-validation.service';
import { OrderDiscountService } from './order-discount.service';
import { DiscountsService } from './discounts.service';

describe('Discounts Engine Suite', () => {
  describe('DiscountCalculator', () => {
    let calculator: DiscountCalculator;

    beforeEach(() => {
      calculator = new DiscountCalculator();
    });

    it('should compute 10% percentage discount on $100 correctly', () => {
      const subtotal = new Prisma.Decimal('100.00');
      const res = calculator.compute(subtotal, DiscountType.PERCENTAGE, new Prisma.Decimal('10.00'));
      expect(res.discountAmount.toString()).toBe('10');
      expect(res.taxableSubtotal.toString()).toBe('90');
    });

    it('should compute 15% percentage discount on $85 correctly (85 * 0.15 = 12.75)', () => {
      const subtotal = new Prisma.Decimal('85.00');
      const res = calculator.compute(subtotal, DiscountType.PERCENTAGE, new Prisma.Decimal('15.00'));
      expect(res.discountAmount.toString()).toBe('12.75');
      expect(res.taxableSubtotal.toString()).toBe('72.25');
    });

    it('should compute 10% percentage discount on complex $999.99 without premature rounding (99.999)', () => {
      const subtotal = new Prisma.Decimal('999.99');
      const res = calculator.compute(subtotal, DiscountType.PERCENTAGE, new Prisma.Decimal('10.00'));
      expect(res.discountAmount.toString()).toBe('99.999');
      expect(res.taxableSubtotal.toString()).toBe('899.991');
    });

    it('should compute 100% discount resulting in $0 taxable subtotal', () => {
      const subtotal = new Prisma.Decimal('100.00');
      const res = calculator.compute(subtotal, DiscountType.PERCENTAGE, new Prisma.Decimal('100.00'));
      expect(res.discountAmount.toString()).toBe('100');
      expect(res.taxableSubtotal.toString()).toBe('0');
    });

    it('should compute $50 fixed discount on $200', () => {
      const subtotal = new Prisma.Decimal('200.00');
      const res = calculator.compute(subtotal, DiscountType.FIXED, new Prisma.Decimal('50.00'));
      expect(res.discountAmount.toString()).toBe('50');
      expect(res.taxableSubtotal.toString()).toBe('150');
    });

    it('should cap fixed discount to subtotal if fixed amount exceeds subtotal (policy: total >= 0)', () => {
      const subtotal = new Prisma.Decimal('30.00');
      const res = calculator.compute(subtotal, DiscountType.FIXED, new Prisma.Decimal('50.00'));
      expect(res.discountAmount.toString()).toBe('30');
      expect(res.taxableSubtotal.toString()).toBe('0');
    });

    it('should cap discount amount if maxAmount is defined (FIXED $50 with maxAmount $20)', () => {
      const subtotal = new Prisma.Decimal('200.00');
      const res = calculator.compute(
        subtotal,
        DiscountType.FIXED,
        new Prisma.Decimal('50.00'),
        new Prisma.Decimal('20.00'),
      );
      expect(res.discountAmount.toString()).toBe('20');
      expect(res.taxableSubtotal.toString()).toBe('180');
    });

    it('should cap percentage discount if maxAmount is defined (20% of $100 = 20 with maxAmount 15)', () => {
      const subtotal = new Prisma.Decimal('100.00');
      const res = calculator.compute(
        subtotal,
        DiscountType.PERCENTAGE,
        new Prisma.Decimal('20.00'),
        new Prisma.Decimal('15.00'),
      );
      expect(res.discountAmount.toString()).toBe('15');
      expect(res.taxableSubtotal.toString()).toBe('85');
    });

    it('should handle $0 subtotal with percentage discount', () => {
      const subtotal = new Prisma.Decimal('0.00');
      const res = calculator.compute(subtotal, DiscountType.PERCENTAGE, new Prisma.Decimal('10.00'));
      expect(res.discountAmount.toString()).toBe('0');
      expect(res.taxableSubtotal.toString()).toBe('0');
    });

    it('should handle $0 subtotal with fixed discount', () => {
      const subtotal = new Prisma.Decimal('0.00');
      const res = calculator.compute(subtotal, DiscountType.FIXED, new Prisma.Decimal('50.00'));
      expect(res.discountAmount.toString()).toBe('0');
      expect(res.taxableSubtotal.toString()).toBe('0');
    });

    it('should compute complex 10% on $333.33 exact decimal precision', () => {
      const subtotal = new Prisma.Decimal('333.33');
      const res = calculator.compute(subtotal, DiscountType.PERCENTAGE, new Prisma.Decimal('10.00'));
      expect(res.discountAmount.toString()).toBe('33.333');
      expect(res.taxableSubtotal.toString()).toBe('299.997');
    });

    it('should compute complex 15% on $999.99 exact decimal precision', () => {
      const subtotal = new Prisma.Decimal('999.99');
      const res = calculator.compute(subtotal, DiscountType.PERCENTAGE, new Prisma.Decimal('15.00'));
      expect(res.discountAmount.toString()).toBe('149.9985');
      expect(res.taxableSubtotal.toString()).toBe('849.9915');
    });
  });

  describe('DiscountValidationService', () => {
    let validator: DiscountValidationService;
    const baseDiscount = {
      id: 'd-1',
      name: '10% OFF',
      description: null,
      code: 'PROMO10',
      type: DiscountType.PERCENTAGE,
      value: new Prisma.Decimal('10.00'),
      isActive: true,
      branchId: null,
      startsAt: null,
      endsAt: null,
      minPurchase: null,
      maxAmount: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const baseOrder = {
      status: 'PENDING' as OrderStatus,
      paymentStatus: 'UNPAID' as OrderPaymentStatus,
      subtotal: new Prisma.Decimal('100.00'),
      branchId: 'branch-1',
    };

    beforeEach(() => {
      validator = new DiscountValidationService();
    });

    it('should pass for valid active discount and order', () => {
      expect(() => validator.validate(baseDiscount, baseOrder)).not.toThrow();
    });

    it('should throw BadRequestException if discount is inactive', () => {
      expect(() =>
        validator.validate({ ...baseDiscount, isActive: false }, baseOrder),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException if current time is before startsAt', () => {
      const now = new Date('2026-06-01T12:00:00Z');
      const startsAt = new Date('2026-06-02T12:00:00Z');
      expect(() =>
        validator.validate({ ...baseDiscount, startsAt }, baseOrder, now),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException if current time is after endsAt', () => {
      const now = new Date('2026-06-10T12:00:00Z');
      const endsAt = new Date('2026-06-09T12:00:00Z');
      expect(() =>
        validator.validate({ ...baseDiscount, endsAt }, baseOrder, now),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException if Order.status is IN_PROGRESS', () => {
      expect(() =>
        validator.validate(baseDiscount, { ...baseOrder, status: 'IN_PROGRESS' as OrderStatus }),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException if Order.status is READY', () => {
      expect(() =>
        validator.validate(baseDiscount, { ...baseOrder, status: 'READY' as OrderStatus }),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException if Order.status is DELIVERED', () => {
      expect(() =>
        validator.validate(baseDiscount, { ...baseOrder, status: 'DELIVERED' as OrderStatus }),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException if Order.status is PAID', () => {
      expect(() =>
        validator.validate(baseDiscount, { ...baseOrder, status: 'PAID' as OrderStatus }),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException if Order.status is CANCELLED', () => {
      expect(() =>
        validator.validate(baseDiscount, { ...baseOrder, status: 'CANCELLED' as OrderStatus }),
      ).toThrow(BadRequestException);
    });

    it('should pass if Order.status is CONFIRMED and UNPAID', () => {
      expect(() =>
        validator.validate(baseDiscount, { ...baseOrder, status: 'CONFIRMED' as OrderStatus }),
      ).not.toThrow();
    });

    it('should throw BadRequestException if paymentStatus is PARTIALLY_PAID', () => {
      expect(() =>
        validator.validate(baseDiscount, { ...baseOrder, paymentStatus: 'PARTIALLY_PAID' as OrderPaymentStatus }),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException if paymentStatus is PAID', () => {
      expect(() =>
        validator.validate(baseDiscount, { ...baseOrder, paymentStatus: 'PAID' as OrderPaymentStatus }),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException if branchId does not match discount branchId', () => {
      expect(() =>
        validator.validate({ ...baseDiscount, branchId: 'branch-2' }, baseOrder),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException if order subtotal < minPurchase', () => {
      expect(() =>
        validator.validate(
          { ...baseDiscount, minPurchase: new Prisma.Decimal('150.00') },
          baseOrder,
        ),
      ).toThrow(BadRequestException);
    });
  });

  describe('OrderDiscountService & DiscountsService Integration', () => {
    let discountsRepo: any;
    let ordersRepo: any;
    let taxConfigService: any;
    let validator: DiscountValidationService;
    let calculator: DiscountCalculator;
    let activityLog: any;
    let eventBus: any;
    let orderDiscountService: OrderDiscountService;
    let discountsService: DiscountsService;

    const mockDiscount = {
      id: 'disc-1',
      name: '10% Off',
      type: DiscountType.PERCENTAGE,
      value: new Prisma.Decimal('10.00'),
      isActive: true,
      startsAt: null,
      endsAt: null,
      branchId: null,
      minPurchase: null,
      maxAmount: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockOrder = {
      id: 'order-1',
      folio: 'ORD-001',
      status: 'PENDING' as OrderStatus,
      paymentStatus: 'UNPAID' as OrderPaymentStatus,
      subtotal: new Prisma.Decimal('100.00'),
      tax: new Prisma.Decimal('15.00'),
      total: new Prisma.Decimal('115.00'),
      version: 1,
      branchId: 'branch-1',
      payments: [],
      discountId: null,
    };

    beforeEach(() => {
      discountsRepo = {
        findById: jest.fn().mockResolvedValue(mockDiscount),
        findActive: jest.fn().mockResolvedValue([mockDiscount]),
        countOrdersUsingDiscount: jest.fn().mockResolvedValue(0),
        delete: jest.fn().mockResolvedValue(mockDiscount),
      };
      ordersRepo = {
        findById: jest.fn().mockResolvedValue(mockOrder),
        updateWithVersion: jest.fn().mockImplementation((_schema, id, _ver, data) => ({
          ...mockOrder,
          ...data,
          discount: data.discount?.connect ? mockDiscount : null,
          discountId: data.discount?.connect ? mockDiscount.id : null,
        })),
        runTransaction: jest.fn().mockImplementation((_schema, fn) => fn({})),
      };
      taxConfigService = {
        getTaxRate: jest.fn().mockResolvedValue(0.15),
      };
      validator = new DiscountValidationService();
      calculator = new DiscountCalculator();
      activityLog = { log: jest.fn().mockResolvedValue(undefined) };
      eventBus = { emit: jest.fn() };

      orderDiscountService = new OrderDiscountService(
        discountsRepo,
        ordersRepo,
        taxConfigService,
        validator,
        calculator,
        activityLog,
        eventBus,
      );

      discountsService = new DiscountsService(discountsRepo);
    });

    it('apply() should apply 10% discount to $100 order correctly (taxable: $90, tax: $13.50, total: $103.50)', async () => {
      const res = await orderDiscountService.apply('tenant_test', 'order-1', 'disc-1', 'user-1');
      expect(ordersRepo.updateWithVersion).toHaveBeenCalledWith(
        'tenant_test',
        'order-1',
        1,
        expect.objectContaining({
          discountAmount: new Prisma.Decimal('10'),
          taxableSubtotal: new Prisma.Decimal('90'),
          tax: new Prisma.Decimal('13.5'),
          total: new Prisma.Decimal('103.5'),
        }),
        expect.anything(),
      );
      expect(activityLog.log).toHaveBeenCalledWith(
        'tenant_test',
        expect.objectContaining({ action: 'ORDER_DISCOUNT_APPLIED' }),
        expect.anything(),
      );
      expect(eventBus.emit).toHaveBeenCalledWith('order:updated', expect.anything());
    });

    it('apply() should apply FIXED $50 discount on $200 order correctly (taxable: $150, tax: $22.50, total: $172.50)', async () => {
      const fixedDiscount = {
        ...mockDiscount,
        type: DiscountType.FIXED,
        value: new Prisma.Decimal('50.00'),
      };
      discountsRepo.findById.mockResolvedValue(fixedDiscount);
      ordersRepo.findById.mockResolvedValue({
        ...mockOrder,
        subtotal: new Prisma.Decimal('200.00'),
      });

      await orderDiscountService.apply('tenant_test', 'order-1', 'disc-1', 'user-1');

      expect(ordersRepo.updateWithVersion).toHaveBeenCalledWith(
        'tenant_test',
        'order-1',
        1,
        expect.objectContaining({
          discountAmount: new Prisma.Decimal('50'),
          taxableSubtotal: new Prisma.Decimal('150'),
          tax: new Prisma.Decimal('22.5'),
          total: new Prisma.Decimal('172.5'),
        }),
        expect.anything(),
      );
    });

    it('apply() should cap FIXED discount exceeding subtotal to subtotal, producing $0 total', async () => {
      const fixedDiscount = {
        ...mockDiscount,
        type: DiscountType.FIXED,
        value: new Prisma.Decimal('50.00'),
      };
      discountsRepo.findById.mockResolvedValue(fixedDiscount);
      ordersRepo.findById.mockResolvedValue({
        ...mockOrder,
        subtotal: new Prisma.Decimal('30.00'),
      });

      await orderDiscountService.apply('tenant_test', 'order-1', 'disc-1', 'user-1');

      expect(ordersRepo.updateWithVersion).toHaveBeenCalledWith(
        'tenant_test',
        'order-1',
        1,
        expect.objectContaining({
          discountAmount: new Prisma.Decimal('30'),
          taxableSubtotal: new Prisma.Decimal('0'),
          tax: new Prisma.Decimal('0'),
          total: new Prisma.Decimal('0'),
        }),
        expect.anything(),
      );
    });

    it('apply() should handle complex rounding on $999.99 with 10% percentage', async () => {
      ordersRepo.findById.mockResolvedValue({
        ...mockOrder,
        subtotal: new Prisma.Decimal('999.99'),
      });

      await orderDiscountService.apply('tenant_test', 'order-1', 'disc-1', 'user-1');

      expect(ordersRepo.updateWithVersion).toHaveBeenCalledWith(
        'tenant_test',
        'order-1',
        1,
        expect.objectContaining({
          discountAmount: new Prisma.Decimal('99.999'),
          taxableSubtotal: new Prisma.Decimal('899.991'),
          tax: new Prisma.Decimal('134.99865'),
          total: new Prisma.Decimal('1034.98965'),
        }),
        expect.anything(),
      );
    });

    it('apply() should throw ConflictException if version conflict occurs (P2025 error)', async () => {
      const err = new Error('P2025') as any;
      err.code = 'P2025';
      ordersRepo.updateWithVersion.mockRejectedValue(err);

      await expect(
        orderDiscountService.apply('tenant_test', 'order-1', 'disc-1', 'user-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('apply() should throw BadRequestException if order has completed payments', async () => {
      ordersRepo.findById.mockResolvedValue({
        ...mockOrder,
        payments: [{ id: 'p-1', status: 'COMPLETED', amount: new Prisma.Decimal('50.00') }],
      });

      await expect(
        orderDiscountService.apply('tenant_test', 'order-1', 'disc-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('remove() should remove discount and recalculate tax and total without discount', async () => {
      ordersRepo.findById.mockResolvedValue({
        ...mockOrder,
        discountId: 'disc-1',
        discountAmount: new Prisma.Decimal('10.00'),
        taxableSubtotal: new Prisma.Decimal('90.00'),
        tax: new Prisma.Decimal('13.50'),
        total: new Prisma.Decimal('103.50'),
      });

      await orderDiscountService.remove('tenant_test', 'order-1', 'user-1');

      expect(ordersRepo.updateWithVersion).toHaveBeenCalledWith(
        'tenant_test',
        'order-1',
        1,
        expect.objectContaining({
          discount: { disconnect: true },
          discountAmount: null,
          taxableSubtotal: null,
          tax: new Prisma.Decimal('15'),
          total: new Prisma.Decimal('115'),
        }),
        expect.anything(),
      );
      expect(activityLog.log).toHaveBeenCalledWith(
        'tenant_test',
        expect.objectContaining({ action: 'ORDER_DISCOUNT_REMOVED' }),
        expect.anything(),
      );
    });

    it('remove() should be no-op if order has no discountId', async () => {
      const res = await orderDiscountService.remove('tenant_test', 'order-1', 'user-1');
      expect(ordersRepo.updateWithVersion).not.toHaveBeenCalled();
      expect(res).toEqual(mockOrder);
    });

    it('remove() should throw BadRequestException if order paymentStatus is not UNPAID', async () => {
      ordersRepo.findById.mockResolvedValue({
        ...mockOrder,
        discountId: 'disc-1',
        payments: [{ id: 'p-1', status: 'COMPLETED', amount: new Prisma.Decimal('10.00') }],
      });

      await expect(orderDiscountService.remove('tenant_test', 'order-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('remove() should throw BadRequestException if order status is IN_PROGRESS', async () => {
      ordersRepo.findById.mockResolvedValue({
        ...mockOrder,
        discountId: 'disc-1',
        status: 'IN_PROGRESS',
      });

      await expect(orderDiscountService.remove('tenant_test', 'order-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('getAvailable() should return only active applicable discounts for order', async () => {
      const res = await orderDiscountService.getAvailable('tenant_test', 'order-1');
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('disc-1');
    });

    it('getAvailable() should return empty list if order status is IN_PROGRESS', async () => {
      ordersRepo.findById.mockResolvedValue({
        ...mockOrder,
        status: 'IN_PROGRESS',
      });

      const res = await orderDiscountService.getAvailable('tenant_test', 'order-1');
      expect(res).toEqual([]);
    });

    it('DiscountsService.delete() should allow deleting discount when no orders are using it', async () => {
      discountsRepo.countOrdersUsingDiscount.mockResolvedValue(0);

      await discountsService.delete('tenant_test', 'disc-1');

      expect(discountsRepo.delete).toHaveBeenCalledWith('tenant_test', 'disc-1');
    });

    it('DiscountsService.delete() should throw ConflictException if orders are using the discount', async () => {
      discountsRepo.countOrdersUsingDiscount.mockResolvedValue(5);

      await expect(discountsService.delete('tenant_test', 'disc-1')).rejects.toThrow(
        ConflictException,
      );
      expect(discountsRepo.delete).not.toHaveBeenCalled();
    });
  });
});
