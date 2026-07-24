import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma-tenant';
import { CashRegisterService } from '../cash-register.service';
import { CashRegisterRepository } from '../cash-register.repository';
import { ActivityLogRepository } from '../../activity-log/activity-log.repository';
import { EventBusService } from '../../event-bus/event-bus.service';

function decimal(v: string | number) {
  return new Prisma.Decimal(String(v));
}

describe('CashRegisterService', () => {
  let service: CashRegisterService;
  let repo: any;
  let activityLogRepo: any;
  let eventBus: any;

  const SCHEMA = 'tenant_test';
  const USER_ID = 'user-1';

  beforeEach(() => {
    repo = {
      findRegisters: jest.fn().mockResolvedValue([]),
      findRegisterById: jest.fn().mockResolvedValue(null),
      findOpenSessionByRegisterId: jest.fn().mockResolvedValue(null),
      findSessionById: jest.fn().mockResolvedValue(null),
      findSessions: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      createRegister: jest.fn(),
      createSession: jest.fn(),
      updateSessionCash: jest.fn(),
      updateSessionStatus: jest.fn(),
      createMovement: jest.fn(),
      createCount: jest.fn(),
      findOpenSessionByBranchId: jest.fn().mockResolvedValue(null),
      runTransaction: jest.fn().mockImplementation((_s: string, cb: any) => cb({})),
    };

    activityLogRepo = { create: jest.fn().mockResolvedValue({}) };

    eventBus = {
      on: jest.fn(),
      emit: jest.fn(),
    };

    service = new CashRegisterService(repo, activityLogRepo, eventBus);
  });

  // ─── A. createRegister: nombre duplicado lanza ConflictException ────────────
  describe('A - createRegister duplicate name', () => {
    it('should throw ConflictException if register name already exists for branch', async () => {
      repo.findRegisters.mockResolvedValue([{ id: 'existing' }]);

      await expect(
        service.createRegister(SCHEMA, { branchId: 'b1', name: 'Caja Principal' }, USER_ID),
      ).rejects.toThrow(ConflictException);
    });

    it('should create register within transaction when name is unique', async () => {
      const createdRegister = { id: 'reg-1', branchId: 'b1', name: 'Caja Principal', status: 'ACTIVE' };
      repo.runTransaction.mockImplementation((_s: string, cb: any) =>
        cb({}).then(() => createdRegister),
      );
      repo.createRegister.mockResolvedValue(createdRegister);

      const result = await service.createRegister(SCHEMA, { branchId: 'b1', name: 'Caja Principal' }, USER_ID);
      expect(result.id).toBe('reg-1');
      expect(repo.createRegister).toHaveBeenCalled();
      expect(activityLogRepo.create).toHaveBeenCalled();
    });
  });

  // ─── B. openSession: register INACTIVE lanza BadRequest ────────────────────
  describe('B - openSession register inactive', () => {
    it('should throw BadRequestException if register is not ACTIVE', async () => {
      repo.findRegisterById.mockResolvedValue({
        id: 'reg-1',
        status: 'INACTIVE',
        branchId: 'b1',
      });

      await expect(
        service.openSession(SCHEMA, { registerId: 'reg-1', openingFloat: 500 }, USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if register not found', async () => {
      await expect(
        service.openSession(SCHEMA, { registerId: 'missing', openingFloat: 500 }, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if openingFloat <= 0', async () => {
      repo.findRegisterById.mockResolvedValue({
        id: 'reg-1',
        status: 'ACTIVE',
        branchId: 'b1',
      });

      await expect(
        service.openSession(SCHEMA, { registerId: 'reg-1', openingFloat: 0 }, USER_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── C. openSession: sesión abierta existente lanza ConflictException ──────
  describe('C - openSession already open session', () => {
    it('should throw ConflictException if session already open for register', async () => {
      repo.findRegisterById.mockResolvedValue({
        id: 'reg-1',
        status: 'ACTIVE',
        branchId: 'b1',
      });
      repo.findOpenSessionByRegisterId.mockResolvedValue({ id: 'sess-1', status: 'OPEN' });

      await expect(
        service.openSession(SCHEMA, { registerId: 'reg-1', openingFloat: 500 }, USER_ID),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException on P2002 unique constraint', async () => {
      repo.findRegisterById.mockResolvedValue({
        id: 'reg-1',
        status: 'ACTIVE',
        branchId: 'b1',
      });
      repo.runTransaction.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.openSession(SCHEMA, { registerId: 'reg-1', openingFloat: 500 }, USER_ID),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── D. createMovement: tipo inválido lanza BadRequest ────────────────────
  describe('D - createMovement invalid type', () => {
    it('should throw BadRequestException for invalid movement type', async () => {
      repo.findSessionById.mockResolvedValue({
        id: 'sess-1',
        status: 'OPEN',
        expectedCash: decimal(500),
        manualMovements: decimal(0),
        register: { branchId: 'b1' },
        version: 1,
      });

      await expect(
        service.createMovement(SCHEMA, 'sess-1', { type: 'INVALID' as any, amount: 100, reason: 'test' }, USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if amount <= 0', async () => {
      repo.findSessionById.mockResolvedValue({
        id: 'sess-1',
        status: 'OPEN',
        expectedCash: decimal(500),
        manualMovements: decimal(0),
        register: { branchId: 'b1' },
        version: 1,
      });

      await expect(
        service.createMovement(SCHEMA, 'sess-1', { type: 'CASH_IN', amount: 0, reason: 'test' }, USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if reason is empty', async () => {
      repo.findSessionById.mockResolvedValue({
        id: 'sess-1',
        status: 'OPEN',
        expectedCash: decimal(500),
        manualMovements: decimal(0),
        register: { branchId: 'b1' },
        version: 1,
      });

      await expect(
        service.createMovement(SCHEMA, 'sess-1', { type: 'CASH_IN', amount: 100, reason: '  ' }, USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if session not OPEN', async () => {
      repo.findSessionById.mockResolvedValue({
        id: 'sess-1',
        status: 'CLOSED',
        version: 1,
      });

      await expect(
        service.createMovement(SCHEMA, 'sess-1', { type: 'CASH_IN', amount: 100, reason: 'test' }, USER_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── E. createMovement: CASH_IN incrementa expectedCash ───────────────────
  describe('E - createMovement CASH_IN', () => {
    it('should increment expectedCash and manualMovements for CASH_IN', async () => {
      const session = {
        id: 'sess-1',
        status: 'OPEN',
        expectedCash: decimal(500),
        manualMovements: decimal(0),
        version: 1,
        register: { branchId: 'b1' },
      };
      repo.findSessionById.mockResolvedValue(session);
      repo.updateSessionCash.mockResolvedValue({ ...session, expectedCash: decimal(600), manualMovements: decimal(100) });

      const result = await service.createMovement(SCHEMA, 'sess-1', { type: 'CASH_IN', amount: 100, reason: 'Depósito' }, USER_ID);

      expect(result).toBeTruthy();
      expect(repo.updateSessionCash).toHaveBeenCalledWith(
        SCHEMA,
        'sess-1',
        expect.objectContaining({ expectedCash: decimal(600), manualMovements: decimal(100) }),
        1,
        expect.anything(),
      );
      expect(repo.createMovement).toHaveBeenCalled();
      expect(activityLogRepo.create).toHaveBeenCalled();
    });
  });

  // ─── F. createMovement: CASH_OUT decrementa expectedCash ──────────────────
  describe('F - createMovement CASH_OUT', () => {
    it('should decrement expectedCash and increment manualMovements for CASH_OUT', async () => {
      const session = {
        id: 'sess-1',
        status: 'OPEN',
        expectedCash: decimal(500),
        manualMovements: decimal(0),
        version: 1,
        register: { branchId: 'b1' },
      };
      repo.findSessionById.mockResolvedValue(session);
      repo.updateSessionCash.mockResolvedValue({ ...session, expectedCash: decimal(400), manualMovements: decimal(100) });

      const result = await service.createMovement(SCHEMA, 'sess-1', { type: 'CASH_OUT', amount: 100, reason: 'Retiro' }, USER_ID);

      expect(result).toBeTruthy();
      expect(repo.updateSessionCash).toHaveBeenCalledWith(
        SCHEMA,
        'sess-1',
        expect.objectContaining({ expectedCash: decimal(400), manualMovements: decimal(100) }),
        1,
        expect.anything(),
      );
    });
  });

  // ─── G. createMovement: ADJUSTMENT no cambia manualMovements ──────────────
  describe('G - createMovement ADJUSTMENT', () => {
    it('should NOT update manualMovements for ADJUSTMENT', async () => {
      const session = {
        id: 'sess-1',
        status: 'OPEN',
        expectedCash: decimal(500),
        manualMovements: decimal(0),
        version: 1,
        register: { branchId: 'b1' },
      };
      repo.findSessionById.mockResolvedValue(session);
      repo.updateSessionCash.mockResolvedValue({ ...session, expectedCash: decimal(500) });

      await service.createMovement(SCHEMA, 'sess-1', { type: 'ADJUSTMENT', amount: 50, reason: 'Ajuste contable' }, USER_ID);

      expect(repo.updateSessionCash).toHaveBeenCalledWith(
        SCHEMA,
        'sess-1',
        expect.objectContaining({ expectedCash: decimal(500) }),
        1,
        expect.anything(),
      );
      const callArgs = repo.updateSessionCash.mock.calls[0][2];
      expect(callArgs).not.toHaveProperty('manualMovements');
    });
  });

  // ─── H. createMovement: concurrent update lanza ConflictException ─────────
  describe('H - createMovement concurrent conflict', () => {
    it('should throw ConflictException on version mismatch', async () => {
      const session = {
        id: 'sess-1',
        status: 'OPEN',
        expectedCash: decimal(500),
        manualMovements: decimal(0),
        version: 1,
        register: { branchId: 'b1' },
      };
      repo.findSessionById.mockResolvedValue(session);
      repo.updateSessionCash.mockResolvedValue(null);

      await expect(
        service.createMovement(SCHEMA, 'sess-1', { type: 'CASH_IN', amount: 100, reason: 'test' }, USER_ID),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── I. createCount: crea registro de arqueo con diferencia correcta ──────
  describe('I - createCount', () => {
    it('should create a cash count with correct difference', async () => {
      const session = {
        id: 'sess-1',
        status: 'OPEN',
        expectedCash: decimal(500),
        register: { branchId: 'b1' },
      };
      repo.findSessionById.mockResolvedValue(session);
      repo.createCount.mockResolvedValue({
        id: 'count-1',
        sessionId: 'sess-1',
        countedCash: decimal(520),
        difference: decimal(20),
      });

      const result = await service.createCount(SCHEMA, 'sess-1', { countedCash: 520, notes: 'Sobrante' }, USER_ID);

      expect(result.id).toBe('count-1');
      expect(repo.createCount).toHaveBeenCalledWith(
        SCHEMA,
        expect.objectContaining({
          countedCash: decimal(520),
          difference: decimal(20),
        }),
        expect.anything(),
      );
      expect(activityLogRepo.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if session not found', async () => {
      await expect(
        service.createCount(SCHEMA, 'missing', { countedCash: 500 }, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if session not OPEN', async () => {
      repo.findSessionById.mockResolvedValue({ id: 'sess-1', status: 'CLOSED' });
      await expect(
        service.createCount(SCHEMA, 'sess-1', { countedCash: 500 }, USER_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── J. closeSession: sesión ya cerrada lanza BadRequest ───────────────────
  describe('J - closeSession already closed', () => {
    it('should throw BadRequestException if session is not OPEN', async () => {
      repo.findSessionById.mockResolvedValue({ id: 'sess-1', status: 'CLOSED', version: 1 });

      await expect(
        service.closeSession(SCHEMA, 'sess-1', { countedCash: 500, version: 1 }, USER_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── K. closeSession: versión incorrecta lanza ConflictException ──────────
  describe('K - closeSession version mismatch', () => {
    it('should throw ConflictException if version does not match', async () => {
      repo.findSessionById.mockResolvedValue({
        id: 'sess-1',
        status: 'OPEN',
        version: 2,
        expectedCash: decimal(500),
      });

      await expect(
        service.closeSession(SCHEMA, 'sess-1', { countedCash: 500, version: 1 }, USER_ID),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── L. closeSession: cierre exitoso con diferencia ────────────────────────
  describe('L - closeSession success with difference', () => {
    it('should close session and record difference', async () => {
      const session = {
        id: 'sess-1',
        status: 'OPEN',
        version: 1,
        expectedCash: decimal(500),
        register: { branchId: 'b1' },
      };
      repo.findSessionById.mockResolvedValue(session);
      const closedSession = { ...session, status: 'CLOSED', countedCash: decimal(520), difference: decimal(20) };
      repo.updateSessionStatus.mockResolvedValue(closedSession);

      const result = await service.closeSession(SCHEMA, 'sess-1', { countedCash: 520, version: 1 }, USER_ID);

      expect(result).toBeTruthy();
      expect(result.status).toBe('CLOSED');
      expect(repo.updateSessionStatus).toHaveBeenCalledWith(
        SCHEMA,
        'sess-1',
        expect.objectContaining({
          status: 'CLOSED',
          closedBy: USER_ID,
          countedCash: decimal(520),
          difference: decimal(20),
        }),
        1,
        expect.anything(),
      );
      expect(repo.createMovement).toHaveBeenCalled();
      expect(activityLogRepo.create).toHaveBeenCalled();
    });
  });

  // ─── M. closeSession: concurrencia al actualizar lanza ConflictException ──
  describe('M - closeSession concurrent update', () => {
    it('should throw ConflictException if updateSessionStatus returns null', async () => {
      const session = {
        id: 'sess-1',
        status: 'OPEN',
        version: 1,
        expectedCash: decimal(500),
        register: { branchId: 'b1' },
      };
      repo.findSessionById.mockResolvedValue(session);
      repo.updateSessionStatus.mockResolvedValue(null);

      await expect(
        service.closeSession(SCHEMA, 'sess-1', { countedCash: 500, version: 1 }, USER_ID),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── N. findSessionById: sesión inexistente lanza NotFoundException ────────
  describe('N - findSessionById not found', () => {
    it('should throw NotFoundException if session not found', async () => {
      await expect(service.findSessionById(SCHEMA, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── O. handlePaymentCompleted: sin sesión abierta no hace nada ───────────
  describe('O - handlePaymentCompleted no open session', () => {
    it('should skip if no open session for branch', async () => {
      repo.findOpenSessionByBranchId.mockResolvedValue(null);

      await service.handlePaymentCompleted({
        schemaName: SCHEMA,
        orderId: 'order-1',
        payments: [{ id: 'pay-1', amount: 100, method: 'CASH', status: 'COMPLETED' }],
        branchId: 'b1',
        userId: USER_ID,
      });

      expect(repo.runTransaction).not.toHaveBeenCalled();
    });

    it('should skip if no CASH payments', async () => {
      repo.findOpenSessionByBranchId.mockResolvedValue({ id: 'sess-1', status: 'OPEN' });

      await service.handlePaymentCompleted({
        schemaName: SCHEMA,
        orderId: 'order-1',
        payments: [{ id: 'pay-1', amount: 100, method: 'CARD', status: 'COMPLETED' }],
        branchId: 'b1',
        userId: USER_ID,
      });

      expect(repo.runTransaction).not.toHaveBeenCalled();
    });

    it('should skip if branchId is null', async () => {
      await service.handlePaymentCompleted({
        schemaName: SCHEMA,
        orderId: 'order-1',
        payments: [{ id: 'pay-1', amount: 100, method: 'CASH', status: 'COMPLETED' }],
        branchId: null,
        userId: USER_ID,
      });

      expect(repo.runTransaction).not.toHaveBeenCalled();
    });

    it('should skip if userId is null', async () => {
      await service.handlePaymentCompleted({
        schemaName: SCHEMA,
        orderId: 'order-1',
        payments: [{ id: 'pay-1', amount: 100, method: 'CASH', status: 'COMPLETED' }],
        branchId: 'b1',
        userId: null,
      });

      expect(repo.runTransaction).not.toHaveBeenCalled();
    });
  });

  // ─── P. handlePaymentCompleted: agrega movimiento y actualiza expectedCash ─
  describe('P - handlePaymentCompleted success', () => {
    it('should create CASH_PAYMENT movement and increment expectedCash', async () => {
      const session = {
        id: 'sess-1',
        status: 'OPEN',
        expectedCash: decimal(500),
        cashPayments: decimal(0),
        version: 1,
        register: { branchId: 'b1' },
      };
      repo.findOpenSessionByBranchId.mockResolvedValue(session);
      repo.findSessionById.mockResolvedValue(session);
      repo.updateSessionCash.mockResolvedValue({ ...session, expectedCash: decimal(600), cashPayments: decimal(100), version: 2 });

      await service.handlePaymentCompleted({
        schemaName: SCHEMA,
        orderId: 'order-1',
        payments: [{ id: 'pay-1', amount: 100, method: 'CASH', status: 'COMPLETED' }],
        branchId: 'b1',
        userId: USER_ID,
      });

      expect(repo.createMovement).toHaveBeenCalledWith(
        SCHEMA,
        expect.objectContaining({ type: 'CASH_PAYMENT', referenceId: 'pay-1' }),
        expect.anything(),
      );
      expect(repo.updateSessionCash).toHaveBeenCalled();
      expect(activityLogRepo.create).toHaveBeenCalled();
    });

    it('should create movements for each CASH payment in a split payment', async () => {
      const session = {
        id: 'sess-1',
        status: 'OPEN',
        expectedCash: decimal(500),
        cashPayments: decimal(0),
        version: 1,
        register: { branchId: 'b1' },
      };
      repo.findOpenSessionByBranchId.mockResolvedValue(session);
      repo.findSessionById.mockResolvedValue(session);
      repo.updateSessionCash
        .mockResolvedValueOnce({ ...session, expectedCash: decimal(600), cashPayments: decimal(100), version: 2 })
        .mockResolvedValueOnce({ ...session, expectedCash: decimal(650), cashPayments: decimal(150), version: 3 });

      await service.handlePaymentCompleted({
        schemaName: SCHEMA,
        orderId: 'order-1',
        payments: [
          { id: 'pay-1', amount: 100, method: 'CASH', status: 'COMPLETED' },
          { id: 'pay-2', amount: 50, method: 'CASH', status: 'COMPLETED' },
        ],
        branchId: 'b1',
        userId: USER_ID,
      });

      expect(repo.createMovement).toHaveBeenCalledTimes(2);
      expect(repo.createMovement).toHaveBeenNthCalledWith(
        1,
        SCHEMA,
        expect.objectContaining({ type: 'CASH_PAYMENT', referenceId: 'pay-1' }),
        expect.anything(),
      );
      expect(repo.createMovement).toHaveBeenNthCalledWith(
        2,
        SCHEMA,
        expect.objectContaining({ type: 'CASH_PAYMENT', referenceId: 'pay-2' }),
        expect.anything(),
      );
      expect(repo.updateSessionCash).toHaveBeenCalledTimes(2);
    });

    it('should skip non-CASH payments in split and only record CASH ones', async () => {
      const session = {
        id: 'sess-1',
        status: 'OPEN',
        expectedCash: decimal(500),
        cashPayments: decimal(0),
        version: 1,
        register: { branchId: 'b1' },
      };
      repo.findOpenSessionByBranchId.mockResolvedValue(session);
      repo.findSessionById.mockResolvedValue(session);
      repo.updateSessionCash.mockResolvedValue({ ...session, expectedCash: decimal(600), cashPayments: decimal(100), version: 2 });

      await service.handlePaymentCompleted({
        schemaName: SCHEMA,
        orderId: 'order-1',
        payments: [
          { id: 'pay-1', amount: 100, method: 'CASH', status: 'COMPLETED' },
          { id: 'pay-2', amount: 200, method: 'CARD', status: 'COMPLETED' },
        ],
        branchId: 'b1',
        userId: USER_ID,
      });

      expect(repo.createMovement).toHaveBeenCalledTimes(1);
      expect(repo.createMovement).toHaveBeenCalledWith(
        SCHEMA,
        expect.objectContaining({ type: 'CASH_PAYMENT', referenceId: 'pay-1', amount: decimal(100) }),
        expect.anything(),
      );
    });

    it('should skip if all CASH payments are non-COMPLETED', async () => {
      repo.findOpenSessionByBranchId.mockResolvedValue({ id: 'sess-1', status: 'OPEN' });

      await service.handlePaymentCompleted({
        schemaName: SCHEMA,
        orderId: 'order-1',
        payments: [
          { id: 'pay-1', amount: 100, method: 'CASH', status: 'PENDING' },
          { id: 'pay-2', amount: 50, method: 'CASH', status: 'PENDING' },
        ],
        branchId: 'b1',
        userId: USER_ID,
      });

      expect(repo.runTransaction).not.toHaveBeenCalled();
    });

    it('should process only the COMPLETED CASH payment in a mixed batch', async () => {
      const session = {
        id: 'sess-1',
        status: 'OPEN',
        expectedCash: decimal(500),
        cashPayments: decimal(0),
        version: 1,
        register: { branchId: 'b1' },
      };
      repo.findOpenSessionByBranchId.mockResolvedValue(session);
      repo.findSessionById.mockResolvedValue(session);
      repo.updateSessionCash.mockResolvedValue({ ...session, expectedCash: decimal(550), cashPayments: decimal(50), version: 2 });

      await service.handlePaymentCompleted({
        schemaName: SCHEMA,
        orderId: 'order-1',
        payments: [
          { id: 'pay-1', amount: 100, method: 'CASH', status: 'PENDING' },
          { id: 'pay-2', amount: 50, method: 'CASH', status: 'COMPLETED' },
        ],
        branchId: 'b1',
        userId: USER_ID,
      });

      expect(repo.createMovement).toHaveBeenCalledTimes(1);
      expect(repo.createMovement).toHaveBeenCalledWith(
        SCHEMA,
        expect.objectContaining({ type: 'CASH_PAYMENT', referenceId: 'pay-2', amount: decimal(50) }),
        expect.anything(),
      );
    });
  });

  // ─── Q. handleRefundCompleted: método no-CASH se ignora ──────────────────
  describe('Q - handleRefundCompleted non-cash ignored', () => {
    it('should skip refund if payment method is not CASH', async () => {
      await service.handleRefundCompleted({
        schemaName: SCHEMA,
        refundId: 'ref-1',
        paymentId: 'pay-1',
        amount: 50,
        paymentMethod: 'CARD',
        status: 'COMPLETED',
        branchId: 'b1',
        userId: USER_ID,
        orderId: 'order-1',
      });

      expect(repo.findOpenSessionByBranchId).not.toHaveBeenCalled();
    });
  });

  // ─── R. handleRefundCompleted: CASH decrementa expectedCash ───────────────
  describe('R - handleRefundCompleted cash success', () => {
    it('should create CASH_REFUND movement and decrement expectedCash', async () => {
      const session = {
        id: 'sess-1',
        status: 'OPEN',
        expectedCash: decimal(500),
        refunds: decimal(0),
        version: 1,
        register: { branchId: 'b1' },
      };
      repo.findOpenSessionByBranchId.mockResolvedValue(session);
      repo.findSessionById.mockResolvedValue(session);
      repo.updateSessionCash.mockResolvedValue({ ...session, expectedCash: decimal(450), refunds: decimal(50), version: 2 });

      await service.handleRefundCompleted({
        schemaName: SCHEMA,
        refundId: 'ref-1',
        paymentId: 'pay-1',
        amount: 50,
        paymentMethod: 'CASH',
        status: 'COMPLETED',
        branchId: 'b1',
        userId: USER_ID,
        orderId: 'order-1',
      });

      expect(repo.createMovement).toHaveBeenCalledWith(
        SCHEMA,
        expect.objectContaining({ type: 'CASH_REFUND', referenceId: 'ref-1' }),
        expect.anything(),
      );
      expect(repo.updateSessionCash).toHaveBeenCalledWith(
        SCHEMA,
        'sess-1',
        expect.objectContaining({ expectedCash: decimal(450), refunds: decimal(50) }),
        1,
        expect.anything(),
      );
      expect(activityLogRepo.create).toHaveBeenCalled();
    });

    it('should skip if no open session for branch', async () => {
      repo.findOpenSessionByBranchId.mockResolvedValue(null);

      await service.handleRefundCompleted({
        schemaName: SCHEMA,
        refundId: 'ref-1',
        paymentId: 'pay-1',
        amount: 50,
        paymentMethod: 'CASH',
        status: 'COMPLETED',
        branchId: 'b1',
        userId: USER_ID,
        orderId: 'order-1',
      });

      expect(repo.runTransaction).not.toHaveBeenCalled();
    });
  });

  // ─── Extra: EventBus listeners registered in constructor ──────────────────
  describe('EventBus registration', () => {
    it('should register payment:completed and refund:completed listeners', () => {
      const listenerCalls = eventBus.on.mock.calls.map((c: any[]) => c[0]);
      expect(listenerCalls).toContain('payment:completed');
      expect(listenerCalls).toContain('refund:completed');
    });
  });

  // ─── Extra: findSessionById success ───────────────────────────────────────
  describe('findSessionById success', () => {
    it('should return session if found', async () => {
      repo.findSessionById.mockResolvedValue({ id: 'sess-1', status: 'OPEN' });
      const result = await service.findSessionById(SCHEMA, 'sess-1');
      expect(result.id).toBe('sess-1');
    });
  });

  // ─── Extra: findCurrentSession ────────────────────────────────────────────
  describe('findCurrentSession', () => {
    it('should return session when branchId provided', async () => {
      repo.findOpenSessionByBranchId.mockResolvedValue({ id: 'sess-1', status: 'OPEN' });
      const result = await service.findCurrentSession(SCHEMA, 'b1');
      expect(result).toBeTruthy();
    });

    it('should return null when no branchId', async () => {
      const result = await service.findCurrentSession(SCHEMA);
      expect(result).toBeNull();
    });
  });

  // ─── Extra: findSessions pagination ───────────────────────────────────────
  describe('findSessions', () => {
    it('should return paginated sessions', async () => {
      repo.findSessions.mockResolvedValue({ data: [{ id: 's1' }, { id: 's2' }], total: 2 });

      const result = await service.findSessions(SCHEMA, { page: 1, limit: 10 });
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by registerId', async () => {
      await service.findSessions(SCHEMA, { registerId: 'reg-1' });
      expect(repo.findSessions).toHaveBeenCalledWith(
        SCHEMA,
        expect.objectContaining({ registerId: 'reg-1' }),
        expect.anything(),
      );
    });

    it('should filter by date range', async () => {
      await service.findSessions(SCHEMA, { dateFrom: '2026-01-01', dateTo: '2026-12-31' });
      expect(repo.findSessions).toHaveBeenCalledWith(
        SCHEMA,
        expect.objectContaining({
          openedAt: {
            gte: new Date('2026-01-01'),
            lte: new Date('2026-12-31'),
          },
        }),
        expect.anything(),
      );
    });
  });

  // ─── S. Payment Idempotency: duplicate event does not duplicate movement ──
  describe('S - Payment idempotency (P2002 on duplicate)', () => {
    const paymentEvent = {
      schemaName: SCHEMA,
      orderId: 'order-1',
      payments: [{ id: 'pay-1', amount: 100, method: 'CASH', status: 'COMPLETED' }],
      branchId: 'b1',
      userId: USER_ID,
    };

    it('should create movement on first payment event', async () => {
      const session = {
        id: 'sess-1', status: 'OPEN', expectedCash: decimal(500),
        cashPayments: decimal(0), version: 1, register: { branchId: 'b1' },
      };
      repo.findOpenSessionByBranchId.mockResolvedValue(session);
      repo.findSessionById.mockResolvedValue(session);
      repo.updateSessionCash.mockResolvedValue({ ...session, expectedCash: decimal(600), cashPayments: decimal(100), version: 2 });

      await service.handlePaymentCompleted(paymentEvent);
      expect(repo.createMovement).toHaveBeenCalled();
      expect(repo.updateSessionCash).toHaveBeenCalled();
    });

    it('should skip duplicate movement on retry (P2002)', async () => {
      const session = {
        id: 'sess-1', status: 'OPEN', expectedCash: decimal(500),
        cashPayments: decimal(0), version: 1, register: { branchId: 'b1' },
      };
      repo.findOpenSessionByBranchId.mockResolvedValue(session);
      repo.findSessionById.mockResolvedValue(session);
      repo.createMovement.mockRejectedValue({ code: 'P2002' });

      await service.handlePaymentCompleted(paymentEvent);

      expect(repo.createMovement).toHaveBeenCalled();
      expect(repo.updateSessionCash).not.toHaveBeenCalled();
    });

    it('should allow two different payments for the same order (different payment IDs)', async () => {
      const session = {
        id: 'sess-1', status: 'OPEN', expectedCash: decimal(500),
        cashPayments: decimal(0), version: 1, register: { branchId: 'b1' },
      };
      repo.findOpenSessionByBranchId.mockResolvedValue(session);
      repo.findSessionById.mockResolvedValue(session);
      repo.updateSessionCash
        .mockResolvedValueOnce({ ...session, expectedCash: decimal(600), cashPayments: decimal(100), version: 2 })
        .mockResolvedValueOnce({ ...session, expectedCash: decimal(650), cashPayments: decimal(150), version: 3 });

      await service.handlePaymentCompleted({
        ...paymentEvent,
        payments: [{ id: 'pay-1', amount: 100, method: 'CASH', status: 'COMPLETED' }],
      });

      await service.handlePaymentCompleted({
        ...paymentEvent,
        payments: [{ id: 'pay-2', amount: 50, method: 'CASH', status: 'COMPLETED' }],
      });

      expect(repo.createMovement).toHaveBeenCalledTimes(2);
      expect(repo.createMovement).toHaveBeenNthCalledWith(
        1, SCHEMA, expect.objectContaining({ referenceId: 'pay-1' }), expect.anything(),
      );
      expect(repo.createMovement).toHaveBeenNthCalledWith(
        2, SCHEMA, expect.objectContaining({ referenceId: 'pay-2' }), expect.anything(),
      );
    });

    it('should skip non-CASH payments', async () => {
      repo.findOpenSessionByBranchId.mockResolvedValue({ id: 'sess-1', status: 'OPEN' });

      await service.handlePaymentCompleted({
        ...paymentEvent,
        payments: [{ id: 'pay-1', amount: 100, method: 'CARD', status: 'COMPLETED' }],
      });

      expect(repo.runTransaction).not.toHaveBeenCalled();
    });

    it('should skip non-COMPLETED payments', async () => {
      repo.findOpenSessionByBranchId.mockResolvedValue({ id: 'sess-1', status: 'OPEN' });

      await service.handlePaymentCompleted({
        ...paymentEvent,
        payments: [{ id: 'pay-1', amount: 100, method: 'CASH', status: 'PENDING' }],
      });

      expect(repo.runTransaction).not.toHaveBeenCalled();
    });
  });

  // ─── T1. Two refunds with different paymentId → two movements ────────────
  describe('T1 - Two refunds with different paymentId create two movements', () => {
    it('should create two CASH_REFUND movements with respective refundIds', async () => {
      const session = {
        id: 'sess-1', status: 'OPEN', expectedCash: decimal(500),
        refunds: decimal(0), version: 1, register: { branchId: 'b1' },
      };
      repo.findOpenSessionByBranchId.mockResolvedValue(session);
      repo.findSessionById.mockResolvedValue(session);
      repo.updateSessionCash
        .mockResolvedValueOnce({ ...session, expectedCash: decimal(450), refunds: decimal(50), version: 2 })
        .mockResolvedValueOnce({ ...session, expectedCash: decimal(400), refunds: decimal(100), version: 3 });

      await service.handleRefundCompleted({
        schemaName: SCHEMA,
        refundId: 'ref-1',
        paymentId: 'pay-a',
        amount: 50,
        paymentMethod: 'CASH',
        status: 'COMPLETED',
        branchId: 'b1',
        userId: USER_ID,
        orderId: 'order-1',
      });

      await service.handleRefundCompleted({
        schemaName: SCHEMA,
        refundId: 'ref-2',
        paymentId: 'pay-b',
        amount: 50,
        paymentMethod: 'CASH',
        status: 'COMPLETED',
        branchId: 'b1',
        userId: USER_ID,
        orderId: 'order-2',
      });

      expect(repo.createMovement).toHaveBeenCalledTimes(2);
      expect(repo.createMovement).toHaveBeenNthCalledWith(
        1, SCHEMA, expect.objectContaining({ type: 'CASH_REFUND', referenceId: 'ref-1' }), expect.anything(),
      );
      expect(repo.createMovement).toHaveBeenNthCalledWith(
        2, SCHEMA, expect.objectContaining({ type: 'CASH_REFUND', referenceId: 'ref-2' }), expect.anything(),
      );
      expect(repo.updateSessionCash).toHaveBeenCalledTimes(2);
    });
  });

  // ─── T2. CASH_PAYMENT stores payment.id as referenceId ───────────────────
  describe('T2 - CASH_PAYMENT stores payment.id as referenceId', () => {
    it('should use payment.id (not orderId) as referenceId in CASH_PAYMENT movement', async () => {
      const session = {
        id: 'sess-1', status: 'OPEN', expectedCash: decimal(500),
        cashPayments: decimal(0), version: 1, register: { branchId: 'b1' },
      };
      repo.findOpenSessionByBranchId.mockResolvedValue(session);
      repo.findSessionById.mockResolvedValue(session);
      repo.updateSessionCash.mockResolvedValue({ ...session, expectedCash: decimal(600), cashPayments: decimal(100), version: 2 });

      await service.handlePaymentCompleted({
        schemaName: SCHEMA,
        orderId: 'order-1',
        payments: [{ id: 'pay-xyz-123', amount: 100, method: 'CASH', status: 'COMPLETED' }],
        branchId: 'b1',
        userId: USER_ID,
      });

      expect(repo.createMovement).toHaveBeenCalledWith(
        SCHEMA,
        expect.objectContaining({ type: 'CASH_PAYMENT', referenceId: 'pay-xyz-123' }),
        expect.anything(),
      );
    });
  });

  // ─── T3. Refund rollback does not propagate event ────────────────────────
  describe('T3 - Refund rollback does not propagate event', () => {
    it('should not update session when transaction throws', async () => {
      const session = {
        id: 'sess-1', status: 'OPEN', expectedCash: decimal(500),
        refunds: decimal(0), version: 1, register: { branchId: 'b1' },
      };
      repo.findOpenSessionByBranchId.mockResolvedValue(session);
      repo.findSessionById.mockResolvedValue(session);
      repo.runTransaction.mockImplementation(async (_s: string, cb: any) => {
        throw new Error('Simulated tx failure');
      });

      await expect(
        service.handleRefundCompleted({
          schemaName: SCHEMA,
          refundId: 'ref-1',
          paymentId: 'pay-1',
          amount: 50,
          paymentMethod: 'CASH',
          status: 'COMPLETED',
          branchId: 'b1',
          userId: USER_ID,
          orderId: 'order-1',
        }),
      ).rejects.toThrow('Simulated tx failure');

      expect(repo.updateSessionCash).not.toHaveBeenCalled();
    });
  });

  // ─── T. Refund Idempotency: duplicate event does not duplicate ───────────
  describe('T - Refund idempotency (P2002 on duplicate)', () => {
    const refundEvent = {
      schemaName: SCHEMA,
      refundId: 'ref-1',
      paymentId: 'pay-1',
      amount: 50,
      paymentMethod: 'CASH',
      status: 'COMPLETED',
      branchId: 'b1',
      userId: USER_ID,
      orderId: 'order-1',
    };

    it('should create movement on first refund event', async () => {
      const session = {
        id: 'sess-1', status: 'OPEN', expectedCash: decimal(500),
        refunds: decimal(0), version: 1, register: { branchId: 'b1' },
      };
      repo.findOpenSessionByBranchId.mockResolvedValue(session);
      repo.findSessionById.mockResolvedValue(session);
      repo.updateSessionCash.mockResolvedValue({ ...session, expectedCash: decimal(450), refunds: decimal(50), version: 2 });

      await service.handleRefundCompleted(refundEvent);
      expect(repo.createMovement).toHaveBeenCalled();
      expect(repo.updateSessionCash).toHaveBeenCalled();
    });

    it('should skip duplicate refund on retry (P2002)', async () => {
      const session = {
        id: 'sess-1', status: 'OPEN', expectedCash: decimal(500),
        refunds: decimal(0), version: 1, register: { branchId: 'b1' },
      };
      repo.findOpenSessionByBranchId.mockResolvedValue(session);
      repo.findSessionById.mockResolvedValue(session);
      repo.createMovement.mockRejectedValue({ code: 'P2002' });

      await service.handleRefundCompleted(refundEvent);

      expect(repo.createMovement).toHaveBeenCalled();
      expect(repo.updateSessionCash).not.toHaveBeenCalled();
    });

    it('should skip non-CASH refund', async () => {
      await service.handleRefundCompleted({
        ...refundEvent,
        paymentMethod: 'CARD',
      });

      expect(repo.findOpenSessionByBranchId).not.toHaveBeenCalled();
    });

    it('should skip if no open session', async () => {
      repo.findOpenSessionByBranchId.mockResolvedValue(null);

      await service.handleRefundCompleted(refundEvent);
      expect(repo.runTransaction).not.toHaveBeenCalled();
    });
  });

  // ─── U. Close Snapshot: late events do not alter closed session ───────────
  describe('U - Close snapshot immutability', () => {
    it('should not modify closed session on late payment event', async () => {
      const closedSession = {
        id: 'sess-1', status: 'CLOSED', expectedCash: decimal(500),
        cashPayments: decimal(100), version: 2, register: { branchId: 'b1' },
      };
      repo.findOpenSessionByBranchId.mockResolvedValue(null);

      await service.handlePaymentCompleted({
        schemaName: SCHEMA,
        orderId: 'order-2',
        payments: [{ id: 'pay-3', amount: 200, method: 'CASH', status: 'COMPLETED' }],
        branchId: 'b1',
        userId: USER_ID,
      });

      expect(repo.runTransaction).not.toHaveBeenCalled();
    });

    it('should not modify closed session on late refund event', async () => {
      repo.findOpenSessionByBranchId.mockResolvedValue(null);

      await service.handleRefundCompleted({
        schemaName: SCHEMA,
        refundId: 'ref-2',
        paymentId: 'pay-2',
        amount: 30,
        paymentMethod: 'CASH',
        status: 'COMPLETED',
        branchId: 'b1',
        userId: USER_ID,
        orderId: 'order-2',
      });

      expect(repo.runTransaction).not.toHaveBeenCalled();
    });

    it('should reject movement on closed session', async () => {
      repo.findSessionById.mockResolvedValue({
        id: 'sess-1', status: 'CLOSED', version: 2,
      });

      await expect(
        service.createMovement(SCHEMA, 'sess-1', { type: 'CASH_IN', amount: 100, reason: 'Late' }, USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject count on closed session', async () => {
      repo.findSessionById.mockResolvedValue({
        id: 'sess-1', status: 'CLOSED', version: 2,
      });

      await expect(
        service.createCount(SCHEMA, 'sess-1', { countedCash: 500 }, USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject double close', async () => {
      repo.findSessionById.mockResolvedValue({
        id: 'sess-1', status: 'CLOSED', version: 2, expectedCash: decimal(500),
      });

      await expect(
        service.closeSession(SCHEMA, 'sess-1', { countedCash: 500, version: 2 }, USER_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── V. No open session policy: logged and skipped ───────────────────────
  describe('V - No open session policy', () => {
    it('payment event logs warning when no open session exists', async () => {
      repo.findOpenSessionByBranchId.mockResolvedValue(null);

      await service.handlePaymentCompleted({
        schemaName: SCHEMA,
        orderId: 'order-x',
        payments: [{ id: 'pay-x', amount: 100, method: 'CASH', status: 'COMPLETED' }],
        branchId: 'b1',
        userId: USER_ID,
      });

      expect(repo.runTransaction).not.toHaveBeenCalled();
    });

    it('refund event logs warning when no open session exists', async () => {
      repo.findOpenSessionByBranchId.mockResolvedValue(null);

      await service.handleRefundCompleted({
        schemaName: SCHEMA,
        refundId: 'ref-x',
        paymentId: 'pay-x',
        amount: 50,
        paymentMethod: 'CASH',
        status: 'COMPLETED',
        branchId: 'b1',
        userId: USER_ID,
        orderId: 'order-x',
      });

      expect(repo.runTransaction).not.toHaveBeenCalled();
    });
  });
});
