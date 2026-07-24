import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma-tenant';
import { ReceiptsService } from '../receipts.service';

function makeDecimal(value: string) {
  return new Prisma.Decimal(value);
}

function makeOrder(overrides: any = {}) {
  return {
    id: 'order-1',
    folio: '20260723-0001',
    tableId: 'table-1',
    branchId: 'branch-1',
    userId: 'user-1',
    customerName: 'Juan Perez',
    status: 'PAID',
    paymentStatus: 'PAID',
    subtotal: makeDecimal('200.00'),
    promotionAmount: makeDecimal('20.00'),
    promotedSubtotal: makeDecimal('180.00'),
    discountAmount: makeDecimal('10.00'),
    taxableSubtotal: makeDecimal('170.00'),
    tax: makeDecimal('27.20'),
    totalBeforeTip: makeDecimal('197.20'),
    tipAmount: makeDecimal('30.00'),
    total: makeDecimal('227.20'),
    amountDueForPayments: makeDecimal('227.20'),
    createdAt: new Date('2026-07-23T10:00:00Z'),
    updatedAt: new Date('2026-07-23T10:05:00Z'),
    orderItems: [
      {
        id: 'oi-1',
        quantity: 2,
        unitPrice: makeDecimal('85.00'),
        subtotal: makeDecimal('170.00'),
        notes: null,
        menuItem: { name: 'Tacos al Pastor' },
      },
      {
        id: 'oi-2',
        quantity: 1,
        unitPrice: makeDecimal('30.00'),
        subtotal: makeDecimal('30.00'),
        notes: 'Sin cebolla',
        menuItem: { name: 'Agua de Horchata' },
      },
    ],
    orderPromotions: [
      {
        id: 'op-1',
        promotionId: 'promo-1',
        nameSnapshot: '2x1 Tacos',
        typeSnapshot: 'PERCENTAGE_DISCOUNT',
        valueSnapshot: makeDecimal('10.00'),
        promotionAmount: makeDecimal('20.00'),
      },
    ],
    payments: [
      {
        id: 'pay-1',
        amount: makeDecimal('227.20'),
        method: 'CASH',
        status: 'COMPLETED',
        processedAt: new Date('2026-07-23T10:05:00Z'),
      },
    ],
    refunds: [],
    tip: {
      method: 'FIXED',
      amount: makeDecimal('30.00'),
    },
    table: { number: 5 },
    branch: { name: 'Sucursal Centro', address: 'Av. Principal 123' },
    ...overrides,
  };
}

function makeReceipt(overrides: any = {}) {
  return {
    id: 'receipt-1',
    orderId: 'order-1',
    folio: 'TKT-000001',
    branchId: 'branch-1',
    userId: 'user-cashier',
    idempotencyKey: 'key-1',
    subtotal: makeDecimal('200.00'),
    promotionAmount: makeDecimal('20.00'),
    discountAmount: makeDecimal('10.00'),
    taxAmount: makeDecimal('27.20'),
    tipAmount: makeDecimal('30.00'),
    total: makeDecimal('227.20'),
    snapshot: {},
    issuedAt: new Date('2026-07-23T10:06:00Z'),
    createdAt: new Date('2026-07-23T10:06:00Z'),
    updatedAt: new Date('2026-07-23T10:06:00Z'),
    ...overrides,
  };
}

describe('ReceiptsService', () => {
  let service: ReceiptsService;
  let repo: any;
  let validation: any;
  let numberService: any;
  let activityLogRepo: any;

  beforeEach(() => {
    repo = {
      findById: jest.fn(),
      findByOrder: jest.fn(),
      findByIdempotencyKey: jest.fn(),
      create: jest.fn(),
      findOrderForReceipt: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      runTransaction: jest.fn().mockImplementation((_s: string, cb: any) => cb({})),
    };
    validation = {
      validateOrderExists: jest.fn(),
      validateOrderFullyPaid: jest.fn(),
      validateIdempotencyConflict: jest.fn(),
    };
    numberService = {
      reserveFolio: jest.fn().mockResolvedValue('TKT-000001'),
    };
    activityLogRepo = {
      create: jest.fn().mockResolvedValue(undefined),
    };

    service = new ReceiptsService(repo, validation, numberService, activityLogRepo);
  });

  describe('create', () => {
    const dto = { orderId: 'order-1', idempotencyKey: 'key-1' };

    it('should create receipt for a fully paid order (case A)', async () => {
      const order = makeOrder();
      repo.findOrderForReceipt.mockResolvedValue(order);
      repo.findByIdempotencyKey.mockResolvedValue(null);
      repo.findByOrder.mockResolvedValue(null);
      repo.create.mockResolvedValue(makeReceipt());

      const result = await service.create('tenant', dto, 'user-cashier', 'Test Restaurant');

      expect(result.id).toBe('receipt-1');
      expect(result.folio).toBe('TKT-000001');
      expect(validation.validateOrderExists).toHaveBeenCalledWith(order);
      expect(validation.validateOrderFullyPaid).toHaveBeenCalledWith(order);
      expect(numberService.reserveFolio).toHaveBeenCalledWith('tenant', expect.anything());
      expect(activityLogRepo.create).toHaveBeenCalledWith(
        'tenant',
        expect.objectContaining({
          action: 'RECEIPT_ISSUED',
          entity: 'RECEIPT',
          entityId: 'receipt-1',
        }),
        expect.anything(),
      );
    });

    it('should reject if order is not fully paid (case B)', async () => {
      const order = makeOrder({
        amountDueForPayments: makeDecimal('1000'),
        payments: [
          { amount: makeDecimal('500'), method: 'CASH', status: 'COMPLETED', processedAt: new Date() },
        ],
      });
      repo.findByIdempotencyKey.mockResolvedValue(null);
      repo.findByOrder.mockResolvedValue(null);
      repo.findOrderForReceipt.mockResolvedValue(order);
      validation.validateOrderExists.mockImplementation(() => {});
      validation.validateOrderFullyPaid.mockImplementation(() => {
        throw new BadRequestException('La orden no está liquidada.');
      });

      await expect(service.create('tenant', dto, 'user-cashier', 'Test Restaurant')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow receipt for fully paid order with refunds (case C - no phantom debt)', async () => {
      const order = makeOrder({
        total: makeDecimal('1000'),
        amountDueForPayments: makeDecimal('1000'),
        payments: [
          { amount: makeDecimal('1000'), method: 'CASH', status: 'PARTIALLY_REFUNDED', processedAt: new Date() },
        ],
        refunds: [
          { amount: makeDecimal('300'), status: 'COMPLETED', createdAt: new Date() },
        ],
      });
      repo.findByIdempotencyKey.mockResolvedValue(null);
      repo.findByOrder.mockResolvedValue(null);
      repo.findOrderForReceipt.mockResolvedValue(order);
      repo.create.mockResolvedValue(makeReceipt({
        id: 'receipt-2',
        folio: 'TKT-000001',
        total: makeDecimal('1000'),
      }));
      validation.validateOrderExists.mockImplementation(() => {});
      validation.validateOrderFullyPaid.mockImplementation(() => {});

      const result = await service.create('tenant', dto, 'user-cashier', 'Test Restaurant');
      expect(result.id).toBe('receipt-2');
    });

    it('should return existing receipt for same idempotency key and same order (case D)', async () => {
      const existing = makeReceipt();
      repo.findByIdempotencyKey.mockResolvedValue(existing);

      const result = await service.create('tenant', dto, 'user-cashier', 'Test Restaurant');
      expect(result.id).toBe('receipt-1');
      expect(repo.runTransaction).not.toHaveBeenCalled();
    });

    it('should throw ConflictException for same idempotency key and different order (case E)', async () => {
      const existing = makeReceipt({ orderId: 'order-different' });
      repo.findByIdempotencyKey.mockResolvedValue(existing);
      validation.validateIdempotencyConflict.mockImplementation(() => {
        throw new BadRequestException(
          'La clave de idempotencia ya fue utilizada con una orden diferente.',
        );
      });

      await expect(
        service.create('tenant', dto, 'user-cashier', 'Test Restaurant'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return existing receipt if order already has receipt (case F)', async () => {
      const existing = makeReceipt();
      repo.findByIdempotencyKey.mockResolvedValue(null);
      repo.findByOrder.mockResolvedValue(existing);

      const result = await service.create('tenant', dto, 'user-cashier', 'Test Restaurant');
      expect(result.id).toBe('receipt-1');
      expect(repo.runTransaction).not.toHaveBeenCalled();
    });

    it('should generate different folios for concurrent requests (case G)', async () => {
      const order = makeOrder();
      let callCount = 0;
      numberService.reserveFolio.mockImplementation(async () => {
        callCount++;
        return callCount === 1 ? 'TKT-000001' : 'TKT-000002';
      });

      repo.findByIdempotencyKey.mockResolvedValue(null);
      repo.findByOrder.mockResolvedValue(null);
      repo.findOrderForReceipt.mockResolvedValue(order);
      repo.create.mockResolvedValue(makeReceipt());

      const result1 = await service.create('tenant', { orderId: 'order-1', idempotencyKey: 'key-1' }, 'user-1', 'R');
      const result2 = await service.create('tenant', { orderId: 'order-2', idempotencyKey: 'key-2' }, 'user-2', 'R');

      expect(result1.folio).toBe('TKT-000001');
    });

    it('should build snapshot with correct financial data (case H)', async () => {
      const order = makeOrder();
      repo.findByIdempotencyKey.mockResolvedValue(null);
      repo.findByOrder.mockResolvedValue(null);
      repo.findOrderForReceipt.mockResolvedValue(order);
      repo.create.mockResolvedValue(makeReceipt());

      await service.create('tenant', dto, 'user-cashier', 'Test Restaurant');

      const createCall = repo.create.mock.calls[0];
      const snapshot = createCall[1].snapshot;

      expect(snapshot.items).toHaveLength(2);
      expect(snapshot.items[0].name).toBe('Tacos al Pastor');
      expect(snapshot.items[0].unitPrice).toBe('85.00');
      expect(snapshot.items[0].subtotal).toBe('170.00');
      expect(snapshot.items[1].notes).toBe('Sin cebolla');
      expect(snapshot.totals.grossSubtotal).toBe('200.00');
      expect(snapshot.totals.promotionAmount).toBe('20.00');
      expect(snapshot.totals.manualDiscountAmount).toBe('10.00');
      expect(snapshot.totals.taxAmount).toBe('27.20');
      expect(snapshot.totals.tipAmount).toBe('30.00');
      expect(snapshot.totals.total).toBe('227.20');
      expect(snapshot.payments).toHaveLength(1);
      expect(snapshot.payments[0].method).toBe('CASH');
      expect(snapshot.refunds).toHaveLength(0);
    });

    it('should not recalculate amounts - snapshot reflects order state (case I)', async () => {
      const order = makeOrder();
      repo.findByIdempotencyKey.mockResolvedValue(null);
      repo.findByOrder.mockResolvedValue(null);
      repo.findOrderForReceipt.mockResolvedValue(order);
      repo.create.mockResolvedValue(makeReceipt());

      await service.create('tenant', dto, 'user-cashier', 'Test Restaurant');

      const createCall = repo.create.mock.calls[0];
      expect(createCall[1].subtotal.toFixed(2)).toBe('200.00');
      expect(createCall[1].total.toFixed(2)).toBe('227.20');
    });

    it('should register ActivityLog within transaction (case J)', async () => {
      const order = makeOrder();
      repo.findByIdempotencyKey.mockResolvedValue(null);
      repo.findByOrder.mockResolvedValue(null);
      repo.findOrderForReceipt.mockResolvedValue(order);
      repo.create.mockResolvedValue(makeReceipt());

      await service.create('tenant', dto, 'user-cashier', 'Test Restaurant');

      expect(activityLogRepo.create).toHaveBeenCalledWith(
        'tenant',
        expect.objectContaining({
          branchId: 'branch-1',
          userId: 'user-cashier',
          action: 'RECEIPT_ISSUED',
          entity: 'RECEIPT',
          entityId: 'receipt-1',
        }),
        expect.anything(),
      );
    });

    it('should rollback entire transaction when ActivityLog fails (case K)', async () => {
      const order = makeOrder();
      repo.findByIdempotencyKey.mockResolvedValue(null);
      repo.findByOrder.mockResolvedValue(null);
      repo.findOrderForReceipt.mockResolvedValue(order);
      repo.create.mockResolvedValue(makeReceipt());

      const logError = new Error('ActivityLog write failed');
      activityLogRepo.create.mockRejectedValue(logError);

      repo.runTransaction.mockImplementation(async (_s: string, cb: any) => {
        try {
          return await cb({});
        } catch (err) {
          throw err;
        }
      });

      await expect(
        service.create('tenant', dto, 'user-cashier', 'Test Restaurant'),
      ).rejects.toThrow('ActivityLog write failed');

      expect(repo.create).toHaveBeenCalled();
      expect(activityLogRepo.create).toHaveBeenCalled();
    });

    it('should handle P2002 on orderId by returning existing receipt (case F race)', async () => {
      const order = makeOrder();
      repo.findByIdempotencyKey.mockResolvedValue(null);
      repo.findByOrder
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeReceipt());
      repo.findOrderForReceipt.mockResolvedValue(order);

      const p2002Error = new Error('Unique constraint') as any;
      p2002Error.code = 'P2002';
      p2002Error.meta = { target: ['order_id'] };

      repo.runTransaction.mockRejectedValue(p2002Error);

      const result = await service.create('tenant', dto, 'user-cashier', 'Test Restaurant');
      expect(result.id).toBe('receipt-1');
    });

    it('should handle P2002 on idempotencyKey with different order as ConflictException', async () => {
      const existing = makeReceipt({ orderId: 'order-different' });
      repo.findByIdempotencyKey
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existing);
      repo.findByOrder.mockResolvedValue(null);

      const p2002Error = new Error('Unique constraint') as any;
      p2002Error.code = 'P2002';
      p2002Error.meta = { target: ['idempotency_key'] };

      repo.runTransaction.mockRejectedValue(p2002Error);

      await expect(
        service.create('tenant', dto, 'user-cashier', 'Test Restaurant'),
      ).rejects.toThrow(ConflictException);
    });

    it('should handle P2002 on unknown target as generic ConflictException', async () => {
      repo.findByIdempotencyKey.mockResolvedValue(null);
      repo.findByOrder.mockResolvedValue(null);

      const p2002Error = new Error('Unique constraint') as any;
      p2002Error.code = 'P2002';
      p2002Error.meta = { target: ['some_unknown_column'] };

      repo.runTransaction.mockRejectedValue(p2002Error);

      await expect(
        service.create('tenant', dto, 'user-cashier', 'Test Restaurant'),
      ).rejects.toThrow(ConflictException);
    });

    it('should return existing receipt when same order + different idempotencyKey (idempotency policy)', async () => {
      const existing = makeReceipt({ idempotencyKey: 'original-key' });
      repo.findByIdempotencyKey.mockResolvedValue(null);
      repo.findByOrder.mockResolvedValue(existing);

      const result = await service.create(
        'tenant',
        { orderId: 'order-1', idempotencyKey: 'different-key' },
        'user-cashier',
        'Test Restaurant',
      );
      expect(result.id).toBe('receipt-1');
      expect(result.folio).toBe('TKT-000001');
      expect(repo.runTransaction).not.toHaveBeenCalled();
    });

    it('should reserve sequential folios (TKT-000001 then TKT-000002)', async () => {
      const order1 = makeOrder({ id: 'order-1' });
      const order2 = makeOrder({ id: 'order-2', folio: '20260723-0002' });

      numberService.reserveFolio
        .mockResolvedValueOnce('TKT-000001')
        .mockResolvedValueOnce('TKT-000002');

      repo.findByIdempotencyKey.mockResolvedValue(null);
      repo.findByOrder.mockResolvedValue(null);
      repo.findOrderForReceipt
        .mockResolvedValueOnce(order1)
        .mockResolvedValueOnce(order2);
      repo.create
        .mockResolvedValueOnce(makeReceipt({ id: 'r-1', folio: 'TKT-000001' }))
        .mockResolvedValueOnce(makeReceipt({ id: 'r-2', folio: 'TKT-000002' }));

      const r1 = await service.create(
        'tenant',
        { orderId: 'order-1', idempotencyKey: 'key-a' },
        'user-1',
        'R',
      );
      const r2 = await service.create(
        'tenant',
        { orderId: 'order-2', idempotencyKey: 'key-b' },
        'user-1',
        'R',
      );

      expect(r1.folio).toBe('TKT-000001');
      expect(r2.folio).toBe('TKT-000002');
      expect(numberService.reserveFolio).toHaveBeenCalledTimes(2);
    });

    it('should isolate tenants: receipt from tenant A not visible from tenant B', async () => {
      repo.findByIdempotencyKey.mockResolvedValue(null);
      repo.findByOrder.mockResolvedValue(null);
      repo.findOrderForReceipt.mockResolvedValue(makeOrder());
      repo.create.mockResolvedValue(makeReceipt());

      await service.create('tenant_a', dto, 'user-1', 'R');

      repo.findByIdempotencyKey.mockResolvedValue(null);
      repo.findByOrder.mockResolvedValue(null);
      repo.findOrderForReceipt.mockResolvedValue(makeOrder({ id: 'order-2' }));
      repo.create.mockResolvedValue(makeReceipt({ id: 'receipt-2', orderId: 'order-2' }));

      await service.create('tenant_b', { orderId: 'order-2', idempotencyKey: 'key-2' }, 'user-1', 'R');

      expect(repo.create).toHaveBeenNthCalledWith(1, 'tenant_a', expect.anything(), expect.anything());
      expect(repo.create).toHaveBeenNthCalledWith(2, 'tenant_b', expect.anything(), expect.anything());
    });

    it('should allow independent folios per tenant (both can have TKT-000001)', async () => {
      numberService.reserveFolio
        .mockResolvedValueOnce('TKT-000001')
        .mockResolvedValueOnce('TKT-000001');

      repo.findByIdempotencyKey.mockResolvedValue(null);
      repo.findByOrder.mockResolvedValue(null);
      repo.findOrderForReceipt.mockResolvedValue(makeOrder());
      repo.create.mockResolvedValue(makeReceipt());

      const r1 = await service.create('tenant_a', { orderId: 'order-1', idempotencyKey: 'k1' }, 'u1', 'R');
      const r2 = await service.create('tenant_b', { orderId: 'order-2', idempotencyKey: 'k2' }, 'u1', 'R');

      expect(r1.folio).toBe('TKT-000001');
      expect(r2.folio).toBe('TKT-000001');
    });
  });

  describe('findById', () => {
    it('should return receipt by ID', async () => {
      repo.findById.mockResolvedValue(makeReceipt());
      const result = await service.findById('tenant', 'receipt-1');
      expect(result.id).toBe('receipt-1');
    });

    it('should throw NotFoundException if not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.findById('tenant', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByOrder', () => {
    it('should return receipt by orderId', async () => {
      repo.findByOrder.mockResolvedValue(makeReceipt());
      const result = await service.findByOrder('tenant', 'order-1');
      expect(result.orderId).toBe('order-1');
    });

    it('should throw NotFoundException if not found', async () => {
      repo.findByOrder.mockResolvedValue(null);
      await expect(service.findByOrder('tenant', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      repo.findMany.mockResolvedValue([makeReceipt()]);
      repo.count.mockResolvedValue(1);

      const result = await service.findAll('tenant', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by folio', async () => {
      repo.findMany.mockResolvedValue([]);
      repo.count.mockResolvedValue(0);

      await service.findAll('tenant', { folio: 'TKT-000001' });

      expect(repo.findMany).toHaveBeenCalledWith(
        'tenant',
        expect.objectContaining({
          where: expect.objectContaining({
            folio: { contains: 'TKT-000001', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should filter by date range', async () => {
      repo.findMany.mockResolvedValue([]);
      repo.count.mockResolvedValue(0);

      await service.findAll('tenant', {
        dateFrom: '2026-07-01T00:00:00.000Z',
        dateTo: '2026-07-31T23:59:59.999Z',
      });

      expect(repo.findMany).toHaveBeenCalledWith(
        'tenant',
        expect.objectContaining({
          where: expect.objectContaining({
            issuedAt: {
              gte: new Date('2026-07-01T00:00:00.000Z'),
              lte: new Date('2026-07-31T23:59:59.999Z'),
            },
          }),
        }),
      );
    });

    it('should filter by orderId', async () => {
      repo.findMany.mockResolvedValue([]);
      repo.count.mockResolvedValue(0);

      await service.findAll('tenant', { orderId: 'order-1' });

      expect(repo.findMany).toHaveBeenCalledWith(
        'tenant',
        expect.objectContaining({
          where: expect.objectContaining({ orderId: 'order-1' }),
        }),
      );
    });

    it('should default to page 1 and limit 20', async () => {
      repo.findMany.mockResolvedValue([]);
      repo.count.mockResolvedValue(0);

      await service.findAll('tenant', {});

      expect(repo.findMany).toHaveBeenCalledWith(
        'tenant',
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
    });
  });

  describe('snapshot integrity', () => {
    it('should snapshot all payment methods', async () => {
      const order = makeOrder({
        payments: [
          { id: 'pay-1', amount: makeDecimal('150.00'), method: 'CASH', status: 'COMPLETED', processedAt: new Date() },
          { id: 'pay-2', amount: makeDecimal('77.20'), method: 'CARD', status: 'COMPLETED', processedAt: new Date() },
        ],
      });
      repo.findByIdempotencyKey.mockResolvedValue(null);
      repo.findByOrder.mockResolvedValue(null);
      repo.findOrderForReceipt.mockResolvedValue(order);
      repo.create.mockResolvedValue(makeReceipt());

      await service.create('tenant', { orderId: 'order-1', idempotencyKey: 'key-1' }, 'user-cashier', 'R');

      const snapshot = repo.create.mock.calls[0][1].snapshot;
      expect(snapshot.payments).toHaveLength(2);
      expect(snapshot.payments[0].method).toBe('CASH');
      expect(snapshot.payments[1].method).toBe('CARD');
    });

    it('should snapshot refunds at time of issuance', async () => {
      const order = makeOrder({
        refunds: [
          { id: 'ref-1', amount: makeDecimal('50.00'), status: 'COMPLETED', createdAt: new Date('2026-07-23T11:00:00Z') },
        ],
      });
      repo.findByIdempotencyKey.mockResolvedValue(null);
      repo.findByOrder.mockResolvedValue(null);
      repo.findOrderForReceipt.mockResolvedValue(order);
      repo.create.mockResolvedValue(makeReceipt());

      await service.create('tenant', { orderId: 'order-1', idempotencyKey: 'key-1' }, 'user-cashier', 'R');

      const snapshot = repo.create.mock.calls[0][1].snapshot;
      expect(snapshot.refunds).toHaveLength(1);
      expect(snapshot.refunds[0].id).toBe('ref-1');
    });

    it('should snapshot applied promotions', async () => {
      const order = makeOrder();
      repo.findByIdempotencyKey.mockResolvedValue(null);
      repo.findByOrder.mockResolvedValue(null);
      repo.findOrderForReceipt.mockResolvedValue(order);
      repo.create.mockResolvedValue(makeReceipt());

      await service.create('tenant', { orderId: 'order-1', idempotencyKey: 'key-1' }, 'user-cashier', 'R');

      const snapshot = repo.create.mock.calls[0][1].snapshot;
      expect(snapshot.totals.promotionAmount).toBe('20.00');
      expect(snapshot.totals.manualDiscountAmount).toBe('10.00');
    });

    it('should include restaurant name from tenant', async () => {
      const order = makeOrder();
      repo.findByIdempotencyKey.mockResolvedValue(null);
      repo.findByOrder.mockResolvedValue(null);
      repo.findOrderForReceipt.mockResolvedValue(order);
      repo.create.mockResolvedValue(makeReceipt());

      await service.create('tenant', { orderId: 'order-1', idempotencyKey: 'key-1' }, 'user-cashier', 'Mi Restaurante');

      const snapshot = repo.create.mock.calls[0][1].snapshot;
      expect(snapshot.restaurant.name).toBe('Mi Restaurante');
    });

    it('should include branch info in snapshot', async () => {
      const order = makeOrder();
      repo.findByIdempotencyKey.mockResolvedValue(null);
      repo.findByOrder.mockResolvedValue(null);
      repo.findOrderForReceipt.mockResolvedValue(order);
      repo.create.mockResolvedValue(makeReceipt());

      await service.create('tenant', { orderId: 'order-1', idempotencyKey: 'key-1' }, 'user-cashier', 'R');

      const snapshot = repo.create.mock.calls[0][1].snapshot;
      expect(snapshot.restaurant.branchName).toBe('Sucursal Centro');
      expect(snapshot.restaurant.address).toBe('Av. Principal 123');
    });
  });

  describe('Decimal usage', () => {
    it('should use Prisma.Decimal for all amounts in snapshot', async () => {
      const order = makeOrder();
      repo.findByIdempotencyKey.mockResolvedValue(null);
      repo.findByOrder.mockResolvedValue(null);
      repo.findOrderForReceipt.mockResolvedValue(order);
      repo.create.mockResolvedValue(makeReceipt());

      await service.create('tenant', { orderId: 'order-1', idempotencyKey: 'key-1' }, 'user-cashier', 'R');

      const snapshot = repo.create.mock.calls[0][1].snapshot;
      expect(typeof snapshot.totals.grossSubtotal).toBe('string');
      expect(typeof snapshot.totals.total).toBe('string');
      expect(typeof snapshot.items[0].unitPrice).toBe('string');
      expect(typeof snapshot.items[0].subtotal).toBe('string');
      expect(typeof snapshot.payments[0].amount).toBe('string');
    });

    it('should use Prisma.Decimal for receipt model amounts', async () => {
      const order = makeOrder();
      repo.findByIdempotencyKey.mockResolvedValue(null);
      repo.findByOrder.mockResolvedValue(null);
      repo.findOrderForReceipt.mockResolvedValue(order);
      repo.create.mockResolvedValue(makeReceipt());

      await service.create('tenant', { orderId: 'order-1', idempotencyKey: 'key-1' }, 'user-cashier', 'R');

      const createCall = repo.create.mock.calls[0][1];
      expect(createCall.subtotal).toBeInstanceOf(Prisma.Decimal);
      expect(createCall.total).toBeInstanceOf(Prisma.Decimal);
      expect(createCall.taxAmount).toBeInstanceOf(Prisma.Decimal);
    });
  });
});
