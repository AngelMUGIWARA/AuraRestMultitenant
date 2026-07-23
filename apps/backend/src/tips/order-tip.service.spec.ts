import { Test, TestingModule } from '@nestjs/testing';
import { OrderTipService } from './order-tip.service';
import { TipCalculator } from './tip-calculator';
import { TipValidationService } from './tip-validation.service';
import { OrdersRepository } from '../orders/orders.repository';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { Prisma } from '../generated/prisma-tenant';
import { ConflictException } from '@nestjs/common';

const mockOrdersRepo = {
  runTransaction: jest.fn((schema, cb) => cb(mockTx)),
  findById: jest.fn(),
};

const mockTx = {
  tip: {
    delete: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  order: {
    update: jest.fn(),
  },
};

const mockActivityLog = {
  log: jest.fn(),
};

describe('OrderTipService', () => {
  let service: OrderTipService;
  
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderTipService,
        TipCalculator,
        TipValidationService,
        { provide: OrdersRepository, useValue: mockOrdersRepo },
        { provide: ActivityLogService, useValue: mockActivityLog },
      ],
    }).compile();

    service = module.get<OrderTipService>(OrderTipService);
    jest.clearAllMocks();
  });

  it('aplicar porcentaje', async () => {
    mockOrdersRepo.findById.mockResolvedValueOnce({
      id: '1', version: 1, status: 'OPEN', totalBeforeTip: new Prisma.Decimal(100), total: new Prisma.Decimal(100), payments: []
    });
    mockTx.order.update.mockResolvedValueOnce({ table: { branchId: 'b1' } });

    await service.applyTip('schema', '1', { method: 'PERCENTAGE', percentage: 10, expectedVersion: 1 }, 'user1');
    expect(mockTx.tip.create).toHaveBeenCalled();
  });

  it('aplicar importe fijo', async () => {
    mockOrdersRepo.findById.mockResolvedValueOnce({
      id: '1', version: 1, status: 'OPEN', totalBeforeTip: new Prisma.Decimal(100), total: new Prisma.Decimal(100), payments: []
    });
    mockTx.order.update.mockResolvedValueOnce({ table: { branchId: 'b1' } });

    await service.applyTip('schema', '1', { method: 'FIXED', amount: 20, expectedVersion: 1 }, 'user1');
    expect(mockTx.tip.create).toHaveBeenCalled();
  });

  it('aplicar efectivo', async () => {
    mockOrdersRepo.findById.mockResolvedValueOnce({
      id: '1', version: 1, status: 'OPEN', totalBeforeTip: new Prisma.Decimal(100), total: new Prisma.Decimal(100), payments: []
    });
    mockTx.order.update.mockResolvedValueOnce({ table: { branchId: 'b1' } });

    await service.applyTip('schema', '1', { method: 'CASH', amount: 20, expectedVersion: 1 }, 'user1');
    expect(mockTx.tip.create).toHaveBeenCalled();
  });

  it('reemplazar propina', async () => {
    mockOrdersRepo.findById.mockResolvedValueOnce({
      id: '1', version: 1, status: 'OPEN', totalBeforeTip: new Prisma.Decimal(100), total: new Prisma.Decimal(100), payments: [], tip: { id: 't1' }
    });
    mockTx.order.update.mockResolvedValueOnce({ table: { branchId: 'b1' } });

    await service.applyTip('schema', '1', { method: 'FIXED', amount: 30, expectedVersion: 1 }, 'user1');
    expect(mockTx.tip.update).toHaveBeenCalled();
  });

  it('eliminar propina', async () => {
    mockOrdersRepo.findById.mockResolvedValueOnce({
      id: '1', version: 1, status: 'OPEN', totalBeforeTip: new Prisma.Decimal(100), total: new Prisma.Decimal(100), payments: [], tip: { id: 't1' }
    });
    mockTx.order.update.mockResolvedValueOnce({ table: { branchId: 'b1' } });

    await service.applyTip('schema', '1', { method: 'NONE', expectedVersion: 1 } as any, 'user1');
    expect(mockTx.tip.delete).toHaveBeenCalled();
  });

  it('optimistic locking conflict', async () => {
    mockOrdersRepo.findById.mockResolvedValueOnce({ id: '1', version: 2 });
    await expect(service.applyTip('schema', '1', { method: 'PERCENTAGE', percentage: 10, expectedVersion: 1 }, 'user1')).rejects.toThrow(ConflictException);
  });

  it('invariante financiera', async () => {
    mockOrdersRepo.findById.mockResolvedValueOnce({
      id: '1', version: 1, status: 'OPEN', totalBeforeTip: new Prisma.Decimal(100), total: new Prisma.Decimal(100), payments: []
    });
    mockTx.order.update.mockResolvedValueOnce({ table: { branchId: 'b1' } });
    await service.applyTip('schema', '1', { method: 'PERCENTAGE', percentage: 15, expectedVersion: 1 }, 'user1');
    
    const updateCall = mockTx.order.update.mock.calls[0][0];
    const data = updateCall.data;
    
    // tipAmount = cashTipAmount + chargeableTipAmount
    expect(data.tipAmount.toNumber()).toBe(data.cashTipAmount.toNumber() + data.chargeableTipAmount.toNumber());
    
    // finalTotal = totalBeforeTip + tipAmount (total stores finalTotal)
    expect(data.total.toNumber()).toBe(data.totalBeforeTip.toNumber() + data.tipAmount.toNumber());
    
    // amountDueForPayments = totalBeforeTip + chargeableTipAmount
    expect(data.amountDueForPayments.toNumber()).toBe(data.totalBeforeTip.toNumber() + data.chargeableTipAmount.toNumber());
  });

});
