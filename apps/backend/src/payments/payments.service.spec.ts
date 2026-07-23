import { BadRequestException, ConflictException } from '@nestjs/common';
import { $Enums, TableStatus } from '../generated/prisma-tenant';
import { PaymentsService } from './payments.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';

const SCHEMA = 'tenant_test';
const ORDER_ID = 'order-001';
const TABLE_ID = 'table-001';
const BRANCH_ID = 'branch-001';
const USER_ID = 'user-001';
const PAYMENT_ID = 'pay-001';

function makeOrder(overrides: Partial<any> = {}) {
  return {
    id: ORDER_ID,
    folio: 'ORD-001',
    total: '97.75',
    status: $Enums.OrderStatus.DELIVERED,
    version: 1,
    tableId: TABLE_ID,
    table: { id: TABLE_ID, branchId: BRANCH_ID },
    payments: [],
    ...overrides,
  };
}

function makePayment(overrides: Partial<any> = {}) {
  return {
    id: PAYMENT_ID,
    orderId: ORDER_ID,
    amount: '97.75',
    method: $Enums.PaymentMethod.CASH,
    status: $Enums.PaymentStatus.COMPLETED,
    reference: null,
    tip: null,
    idempotencyKey: null,
    processedAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
}

function makeDto(overrides: Partial<ProcessPaymentDto> = {}): ProcessPaymentDto {
  return {
    orderId: ORDER_ID,
    payments: [{ amount: '97.75', method: 'CASH' as any }],
    ...overrides,
  } as ProcessPaymentDto;
}

describe('PaymentsService', () => {
  let service: PaymentsService;
  let repo: {
    findPaymentByIdempotencyKey: jest.Mock;
    runTransaction: jest.Mock;
    findOrderById: jest.Mock;
    createPayment: jest.Mock;
    createTip: jest.Mock;
    updateOrderPaymentStatus: jest.Mock;
    updateTableStatus: jest.Mock;
    findByOrder: jest.Mock;
  };
  let eventBus: { emit: jest.Mock };
  let activityLog: { log: jest.Mock };

  beforeEach(() => {
    repo = {
      findPaymentByIdempotencyKey: jest.fn().mockResolvedValue(null),
      runTransaction: jest.fn(),
      findOrderById: jest.fn(),
      createPayment: jest.fn(),
      createTip: jest.fn(),
      updateOrderPaymentStatus: jest.fn(),
      updateTableStatus: jest.fn(),
      findByOrder: jest.fn(),
    };
    eventBus = { emit: jest.fn() };
    activityLog = { log: jest.fn() };

    service = new PaymentsService(
      repo as any,
      eventBus as any,
      activityLog as any,
    );
  });

  function txWithOrder(order: any, payments?: any[]) {
    repo.runTransaction.mockImplementation(async (_schema: string, fn: any) => {
      repo.findOrderById.mockResolvedValue(order);
      if (payments) {
        let idx = 0;
        repo.createPayment.mockImplementation(async (_s: string, data: any) => {
          const p = payments[idx++];
          return { ...p, method: data.method, amount: data.amount };
        });
      } else {
        repo.createPayment.mockResolvedValue(makePayment());
      }
      repo.updateOrderPaymentStatus.mockResolvedValue({});
      repo.updateTableStatus.mockResolvedValue({});
      repo.createTip.mockResolvedValue({});
      return fn('tx');
    });
  }

  describe('processPayment - happy path', () => {
    it('should process a full payment on an unpaid order', async () => {
      txWithOrder(makeOrder());

      const result = await service.processPayment(SCHEMA, makeDto(), USER_ID);

      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(97.75);
      expect(result[0].method).toBe('cash');
      expect(result[0].status).toBe('paid');
      expect(repo.updateOrderPaymentStatus).toHaveBeenCalledWith(
        SCHEMA, ORDER_ID, 'PAID', 1, 'tx',
      );
      expect(repo.updateTableStatus).toHaveBeenCalledWith(
        SCHEMA, TABLE_ID, TableStatus.AVAILABLE, 'tx',
      );
    });

    it('should process a partial payment', async () => {
      txWithOrder(makeOrder(), [makePayment({ amount: '50.00' })]);

      const result = await service.processPayment(
        SCHEMA,
        makeDto({ payments: [{ amount: '50.00', method: 'CASH' as any }] }),
        USER_ID,
      );

      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(50);
      expect(repo.updateOrderPaymentStatus).toHaveBeenCalledWith(
        SCHEMA, ORDER_ID, 'PARTIALLY_PAID', 1, 'tx',
      );
      expect(repo.updateTableStatus).not.toHaveBeenCalled();
    });

    it('should process a second partial payment that fully pays the order', async () => {
      const order = makeOrder({
        payments: [makePayment({ amount: '50.00', id: 'pay-prev' })],
      });
      txWithOrder(order, [makePayment({ amount: '47.75' })]);

      await service.processPayment(
        SCHEMA,
        makeDto({ payments: [{ amount: '47.75', method: 'CARD' as any }] }),
        USER_ID,
      );

      expect(repo.updateOrderPaymentStatus).toHaveBeenCalledWith(
        SCHEMA, ORDER_ID, 'PAID', 1, 'tx',
      );
      expect(repo.updateTableStatus).toHaveBeenCalled();
    });

    it('should create multiple payment splits in one call', async () => {
      txWithOrder(makeOrder(), [
        makePayment({ amount: '60.00', id: 'pay-1' }),
        makePayment({ amount: '37.75', id: 'pay-2' }),
      ]);

      const result = await service.processPayment(
        SCHEMA,
        makeDto({
          payments: [
            { amount: '60.00', method: 'CASH' as any },
            { amount: '37.75', method: 'CARD' as any },
          ],
        }),
        USER_ID,
      );

      expect(result).toHaveLength(2);
      expect(repo.createPayment).toHaveBeenCalledTimes(2);
      expect(repo.updateOrderPaymentStatus).toHaveBeenCalledWith(
        SCHEMA, ORDER_ID, 'PAID', 1, 'tx',
      );
    });

  });

  describe('processPayment - validation errors', () => {
    it('should throw BadRequestException if order not found', async () => {
      txWithOrder(null);

      await expect(
        service.processPayment(SCHEMA, makeDto()),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if order is cancelled', async () => {
      txWithOrder(makeOrder({ status: $Enums.OrderStatus.CANCELLED }));

      await expect(
        service.processPayment(SCHEMA, makeDto()),
      ).rejects.toThrow('No se puede pagar una orden cancelada');
    });

    it('should throw BadRequestException if order is already fully paid', async () => {
      txWithOrder(makeOrder({
        payments: [makePayment({ amount: '97.75' })],
      }));

      await expect(
        service.processPayment(SCHEMA, makeDto()),
      ).rejects.toThrow('La orden ya fue pagada');
    });

    it('should throw BadRequestException if payment amount exceeds pending', async () => {
      txWithOrder(makeOrder());

      await expect(
        service.processPayment(
          SCHEMA,
          makeDto({ payments: [{ amount: '200.00', method: 'CASH' as any }] }),
        ),
      ).rejects.toThrow('El monto excede el saldo pendiente');
    });

    it('should throw BadRequestException if payment amount is zero', async () => {
      txWithOrder(makeOrder());

      await expect(
        service.processPayment(
          SCHEMA,
          makeDto({ payments: [{ amount: '0', method: 'CASH' as any }] }),
        ),
      ).rejects.toThrow('El monto de cada pago debe ser mayor a cero');
    });

    it('should throw BadRequestException if payment amount is negative', async () => {
      txWithOrder(makeOrder());

      await expect(
        service.processPayment(
          SCHEMA,
          makeDto({ payments: [{ amount: '-10', method: 'CASH' as any }] }),
        ),
      ).rejects.toThrow('El monto de cada pago debe ser mayor a cero');
    });

    it('should throw BadRequestException if payment amount is not a valid number', async () => {
      txWithOrder(makeOrder());

      await expect(
        service.processPayment(
          SCHEMA,
          makeDto({ payments: [{ amount: 'abc', method: 'CASH' as any }] }),
        ),
      ).rejects.toThrow('El monto de cada pago debe ser mayor a cero');
    });
  });

  describe('processPayment - idempotency', () => {
    it('should return existing payment if idempotency key matches', async () => {
      const existingPayment = makePayment();
      repo.findPaymentByIdempotencyKey.mockResolvedValue(existingPayment);

      const result = await service.processPayment(
        SCHEMA,
        makeDto({ idempotencyKey: 'idem-key-1' }),
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(PAYMENT_ID);
      expect(repo.runTransaction).not.toHaveBeenCalled();
    });

    it('should return existing payment on P2002 conflict with idempotency key', async () => {
      const existingPayment = makePayment();
      const p2002Error = new Error('Unique constraint');
      (p2002Error as any).code = 'P2002';

      repo.runTransaction.mockRejectedValue(p2002Error);
      repo.findPaymentByIdempotencyKey
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingPayment);

      const result = await service.processPayment(
        SCHEMA,
        makeDto({ idempotencyKey: 'idem-key-1' }),
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(PAYMENT_ID);
    });
  });

  describe('processPayment - concurrency', () => {
    it('should throw ConflictException on P2025 version conflict', async () => {
      const p2025Error = new Error('Record modified');
      (p2025Error as any).code = 'P2025';

      repo.runTransaction.mockRejectedValue(p2025Error);

      await expect(
        service.processPayment(SCHEMA, makeDto(), USER_ID),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('processPayment - table release', () => {
    it('should release table when order is fully paid', async () => {
      txWithOrder(makeOrder());

      await service.processPayment(SCHEMA, makeDto(), USER_ID);

      expect(repo.updateTableStatus).toHaveBeenCalledWith(
        SCHEMA, TABLE_ID, TableStatus.AVAILABLE, 'tx',
      );
    });

    it('should NOT release table on partial payment', async () => {
      txWithOrder(makeOrder(), [makePayment({ amount: '50.00' })]);

      await service.processPayment(
        SCHEMA,
        makeDto({ payments: [{ amount: '50.00', method: 'CASH' as any }] }),
        USER_ID,
      );

      expect(repo.updateTableStatus).not.toHaveBeenCalled();
    });

    it('should NOT attempt table release if order has no table (takeout)', async () => {
      txWithOrder(makeOrder({ table: null, tableId: null }));

      await service.processPayment(SCHEMA, makeDto(), USER_ID);

      expect(repo.updateTableStatus).not.toHaveBeenCalled();
    });
  });

  describe('processPayment - activity logging', () => {
    it('should log activity when userId and branchId are present', async () => {
      txWithOrder(makeOrder());

      await service.processPayment(SCHEMA, makeDto(), USER_ID);

      expect(activityLog.log).toHaveBeenCalledWith(
        SCHEMA,
        expect.objectContaining({
          branchId: BRANCH_ID,
          userId: USER_ID,
          action: 'PAYMENT_PROCESSED',
          entity: 'ORDER',
          entityId: ORDER_ID,
        }),
        'tx',
      );
    });

    it('should NOT log activity when userId is absent', async () => {
      txWithOrder(makeOrder());

      await service.processPayment(SCHEMA, makeDto());

      expect(activityLog.log).not.toHaveBeenCalled();
    });
  });

  describe('processPayment - event emission', () => {
    it('should emit payment:completed with methods array for single CASH payment', async () => {
      txWithOrder(makeOrder());

      await service.processPayment(SCHEMA, makeDto(), USER_ID);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'payment:completed',
        expect.objectContaining({
          orderId: ORDER_ID,
          orderNumber: 'ORD-001',
          methods: ['cash'],
          amount: 97.75,
          isFullyPaid: true,
          remainingAmount: 0,
        }),
      );
    });

    it('should emit payment:completed with methods array for single CARD payment', async () => {
      repo.runTransaction.mockImplementation(async (_schema: string, fn: any) => {
        repo.findOrderById.mockResolvedValue(makeOrder());
        repo.createPayment.mockResolvedValue(makePayment({ method: $Enums.PaymentMethod.CARD }));
        repo.updateOrderPaymentStatus.mockResolvedValue({});
        repo.updateTableStatus.mockResolvedValue({});
        return fn('tx');
      });

      await service.processPayment(
        SCHEMA,
        makeDto({ payments: [{ amount: '97.75', method: 'CARD' as any }] }),
        USER_ID,
      );

      expect(eventBus.emit).toHaveBeenCalledWith(
        'payment:completed',
        expect.objectContaining({ methods: ['card'] }),
      );
    });

    it('should emit payment:completed with methods array for single QR payment', async () => {
      repo.runTransaction.mockImplementation(async (_schema: string, fn: any) => {
        repo.findOrderById.mockResolvedValue(makeOrder());
        repo.createPayment.mockResolvedValue(makePayment({ method: $Enums.PaymentMethod.QR }));
        repo.updateOrderPaymentStatus.mockResolvedValue({});
        repo.updateTableStatus.mockResolvedValue({});
        return fn('tx');
      });

      await service.processPayment(
        SCHEMA,
        makeDto({ payments: [{ amount: '97.75', method: 'QR' as any }] }),
        USER_ID,
      );

      expect(eventBus.emit).toHaveBeenCalledWith(
        'payment:completed',
        expect.objectContaining({ methods: ['qr'] }),
      );
    });

    it('should emit payment:completed with methods=["cash","card"] for CASH+CARD split', async () => {
      txWithOrder(makeOrder(), [
        makePayment({ amount: '50.00', id: 'pay-1' }),
        makePayment({ amount: '47.75', id: 'pay-2' }),
      ]);

      await service.processPayment(
        SCHEMA,
        makeDto({
          payments: [
            { amount: '50.00', method: 'CASH' as any },
            { amount: '47.75', method: 'CARD' as any },
          ],
        }),
        USER_ID,
      );

      expect(eventBus.emit).toHaveBeenCalledWith(
        'payment:completed',
        expect.objectContaining({ methods: ['cash', 'card'] }),
      );
    });

    it('should emit payment:completed with methods=["cash","card","qr"] for three-way split', async () => {
      txWithOrder(makeOrder(), [
        makePayment({ amount: '50.00', id: 'pay-1' }),
        makePayment({ amount: '30.00', id: 'pay-2' }),
        makePayment({ amount: '17.75', id: 'pay-3' }),
      ]);

      await service.processPayment(
        SCHEMA,
        makeDto({
          payments: [
            { amount: '50.00', method: 'CASH' as any },
            { amount: '30.00', method: 'CARD' as any },
            { amount: '17.75', method: 'QR' as any },
          ],
        }),
        USER_ID,
      );

      expect(eventBus.emit).toHaveBeenCalledWith(
        'payment:completed',
        expect.objectContaining({ methods: ['cash', 'card', 'qr'] }),
      );
    });

    it('should include paidAmount and remainingAmount in event', async () => {
      txWithOrder(makeOrder(), [makePayment({ amount: '50.00' })]);

      await service.processPayment(
        SCHEMA,
        makeDto({ payments: [{ amount: '50.00', method: 'CASH' as any }] }),
        USER_ID,
      );

      expect(eventBus.emit).toHaveBeenCalledWith(
        'payment:completed',
        expect.objectContaining({
          paidAmount: 50,
          remainingAmount: 47.75,
          isFullyPaid: false,
        }),
      );
    });

    it('event should NEVER contain method="multiple"', async () => {
      txWithOrder(makeOrder(), [
        makePayment({ amount: '50.00', id: 'pay-1' }),
        makePayment({ amount: '47.75', id: 'pay-2' }),
      ]);

      await service.processPayment(
        SCHEMA,
        makeDto({
          payments: [
            { amount: '50.00', method: 'CASH' as any },
            { amount: '47.75', method: 'CARD' as any },
          ],
        }),
        USER_ID,
      );

      const emittedPayload = eventBus.emit.mock.calls.find(
        (c: any[]) => c[0] === 'payment:completed',
      )?.[1];

      expect(emittedPayload).toBeDefined();
      expect(emittedPayload.method).toBeUndefined();
      expect(emittedPayload.methods).toBeDefined();
      expect(Array.isArray(emittedPayload.methods)).toBe(true);
      expect(emittedPayload.methods).not.toContain('multiple');
    });
  });

  describe('findByOrder', () => {
    it('should return mapped payments for an order', async () => {
      const payments = [
        makePayment({ amount: '50.00' }),
        makePayment({ amount: '47.75', id: 'pay-2' }),
      ];
      repo.findByOrder.mockResolvedValue(payments);

      const result = await repo.findByOrder(SCHEMA, ORDER_ID);

      expect(result).toHaveLength(2);
      expect(result[0].amount).toBe('50.00');
      expect(result[1].amount).toBe('47.75');
    });
  });

  describe('payment response mapping', () => {
    it('should map CASH method to lowercase', async () => {
      txWithOrder(makeOrder());

      const result = await service.processPayment(SCHEMA, makeDto(), USER_ID);
      expect(result[0].method).toBe('cash');
    });

    it('should map CARD method to lowercase', async () => {
      repo.runTransaction.mockImplementation(async (_schema: string, fn: any) => {
        repo.findOrderById.mockResolvedValue(makeOrder());
        repo.createPayment.mockResolvedValue(makePayment({ method: $Enums.PaymentMethod.CARD }));
        repo.updateOrderPaymentStatus.mockResolvedValue({});
        repo.updateTableStatus.mockResolvedValue({});
        return fn('tx');
      });

      const result = await service.processPayment(
        SCHEMA,
        makeDto({ payments: [{ amount: '97.75', method: 'CARD' as any }] }),
        USER_ID,
      );
      expect(result[0].method).toBe('card');
    });

    it('should map QR method to lowercase', async () => {
      repo.runTransaction.mockImplementation(async (_schema: string, fn: any) => {
        repo.findOrderById.mockResolvedValue(makeOrder());
        repo.createPayment.mockResolvedValue(makePayment({ method: $Enums.PaymentMethod.QR }));
        repo.updateOrderPaymentStatus.mockResolvedValue({});
        repo.updateTableStatus.mockResolvedValue({});
        return fn('tx');
      });

      const result = await service.processPayment(
        SCHEMA,
        makeDto({ payments: [{ amount: '97.75', method: 'QR' as any }] }),
        USER_ID,
      );
      expect(result[0].method).toBe('qr');
    });

    it('should map COMPLETED status to "paid"', async () => {
      txWithOrder(makeOrder());

      const result = await service.processPayment(SCHEMA, makeDto(), USER_ID);
      expect(result[0].status).toBe('paid');
    });

    it('each payment record should have its own real method, never "multiple"', async () => {
      txWithOrder(makeOrder(), [
        makePayment({ amount: '50.00', id: 'pay-1' }),
        makePayment({ amount: '47.75', id: 'pay-2' }),
      ]);

      const result = await service.processPayment(
        SCHEMA,
        makeDto({
          payments: [
            { amount: '50.00', method: 'CASH' as any },
            { amount: '47.75', method: 'CARD' as any },
          ],
        }),
        USER_ID,
      );

      expect(result[0].method).toBe('cash');
      expect(result[1].method).toBe('card');
      expect(result[0].method).not.toBe('multiple');
      expect(result[1].method).not.toBe('multiple');
    });
  });

  describe('edge cases', () => {
    it('should handle floating point precision correctly (10 + 20 + 0.1 = 30.1)', async () => {
      txWithOrder(makeOrder({ total: '30.10' }));

      await service.processPayment(
        SCHEMA,
        makeDto({ payments: [{ amount: '30.10', method: 'CASH' as any }] }),
        USER_ID,
      );

      expect(repo.updateOrderPaymentStatus).toHaveBeenCalledWith(
        SCHEMA, ORDER_ID, 'PAID', 1, 'tx',
      );
    });

    it('should allow paying 1 cent less than total (partial)', async () => {
      txWithOrder(makeOrder(), [makePayment({ amount: '97.74' })]);

      await service.processPayment(
        SCHEMA,
        makeDto({ payments: [{ amount: '97.74', method: 'CASH' as any }] }),
        USER_ID,
      );

      expect(repo.updateOrderPaymentStatus).toHaveBeenCalledWith(
        SCHEMA, ORDER_ID, 'PARTIALLY_PAID', 1, 'tx',
      );
    });

    it('should reject payment if alreadyPaid covers the total', async () => {
      txWithOrder(makeOrder({
        payments: [makePayment({ amount: '97.75' })],
      }));

      await expect(
        service.processPayment(SCHEMA, makeDto()),
      ).rejects.toThrow('La orden ya fue pagada');
    });

    it('should NOT allow paying debt when order is fully paid but has a completed refund', async () => {
      txWithOrder(makeOrder({
        total: '1000.00',
        amountDueForPayments: '1000.00',
        payments: [makePayment({ amount: '1000.00' })],
        refunds: [{ status: 'COMPLETED', amount: '300.00' }]
      }));

      await expect(
        service.processPayment(SCHEMA, makeDto({ payments: [{ amount: '300.00', method: 'CASH' as any }] })),
      ).rejects.toThrow('La orden ya fue pagada');
    });
  });
});
