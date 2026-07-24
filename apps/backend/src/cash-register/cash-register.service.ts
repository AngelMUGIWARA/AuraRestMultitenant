import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma-tenant';
import type { CashSessionStatus, CashMovementType } from '../generated/prisma-tenant';
import { ActivityLogRepository } from '../activity-log/activity-log.repository';
import { CashRegisterRepository } from './cash-register.repository';
import { EventBusService } from '../event-bus/event-bus.service';

const VALID_MANUAL_MOVEMENT_TYPES = new Set(['CASH_IN', 'CASH_OUT', 'ADJUSTMENT']);

@Injectable()
export class CashRegisterService {
  private readonly logger = new Logger(CashRegisterService.name);

  constructor(
    private readonly repo: CashRegisterRepository,
    private readonly activityLogRepo: ActivityLogRepository,
    private readonly eventBus: EventBusService,
  ) {
    this.eventBus.on('payment:completed', (data: any) =>
      this.handlePaymentCompleted(data).catch((err) => {
        this.logger.error('Error handling payment:completed', err);
      }),
    );
    this.eventBus.on('refund:completed', (data: any) =>
      this.handleRefundCompleted(data).catch((err) => {
        this.logger.error('Error handling refund:completed', err);
      }),
    );
  }

  async createRegister(
    schemaName: string,
    dto: { branchId: string; name: string },
    userId: string,
  ) {
    const existing = await this.repo.findRegisters(schemaName, {
      branchId: dto.branchId,
      name: dto.name,
    });
    if (existing.length > 0) {
      throw new ConflictException(
        'Ya existe un registro de caja con ese nombre para esta sucursal.',
      );
    }

    try {
      return await this.repo.runTransaction(schemaName, async (tx) => {
        const register = await this.repo.createRegister(
          schemaName,
          { branchId: dto.branchId, name: dto.name },
          tx,
        );

        await this.activityLogRepo.create(
          schemaName,
          {
            branchId: dto.branchId,
            userId,
            action: 'CASH_REGISTER_CREATED',
            entity: 'CASH_REGISTER',
            entityId: register.id,
            changes: JSON.stringify({
              name: register.name,
              branchId: register.branchId,
            }),
          },
          tx,
        );

        return register;
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException(
          'Ya existe un registro de caja con ese nombre para esta sucursal.',
        );
      }
      throw error;
    }
  }

  async findRegisters(schemaName: string, branchId?: string) {
    const where: Prisma.CashRegisterWhereInput = {};
    if (branchId) {
      where.branchId = branchId;
    }
    return this.repo.findRegisters(schemaName, where);
  }

  async openSession(
    schemaName: string,
    dto: { registerId: string; openingFloat: number | string },
    userId: string,
  ) {
    const register = await this.repo.findRegisterById(schemaName, dto.registerId);
    if (!register) {
      throw new NotFoundException('Registro de caja no encontrado.');
    }
    if (register.status !== 'ACTIVE') {
      throw new BadRequestException(
        'El registro de caja no está activo.',
      );
    }

    const openingFloat = new Prisma.Decimal(dto.openingFloat);
    if (openingFloat.lte(0)) {
      throw new BadRequestException(
        'El monto de fondo inicial debe ser mayor a 0.',
      );
    }

    try {
      return await this.repo.runTransaction(schemaName, async (tx) => {
        const existingOpen = await this.repo.findOpenSessionByRegisterId(
          schemaName,
          dto.registerId,
          tx,
        );
        if (existingOpen) {
          throw new ConflictException(
            'Ya existe una sesión abierta para este registro de caja.',
          );
        }

        const session = await this.repo.createSession(
          schemaName,
          {
            registerId: dto.registerId,
            openedBy: userId,
            openingFloat,
          },
          tx,
        );

        await this.repo.createMovement(
          schemaName,
          {
            sessionId: session.id,
            type: 'OPENING_FLOAT',
            amount: openingFloat,
            reason: 'Fondo inicial',
            createdBy: userId,
          },
          tx,
        );

        await this.activityLogRepo.create(
          schemaName,
          {
            branchId: register.branchId,
            userId,
            action: 'CASH_SESSION_OPENED',
            entity: 'CASH_SESSION',
            entityId: session.id,
            changes: JSON.stringify({
              registerId: dto.registerId,
              registerName: register.name,
              openingFloat: openingFloat.toString(),
            }),
          },
          tx,
        );

        return session;
      });
    } catch (error: any) {
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      if (error?.code === 'P2002') {
        throw new ConflictException(
          'Ya existe una sesión abierta para este registro de caja.',
        );
      }
      throw error;
    }
  }

  async findCurrentSession(schemaName: string, branchId?: string) {
    if (branchId) {
      const session = await this.repo.findOpenSessionByBranchId(
        schemaName,
        branchId,
      );
      return session ?? null;
    }
    return null;
  }

  async findSessionById(schemaName: string, id: string) {
    const session = await this.repo.findSessionById(schemaName, id);
    if (!session) {
      throw new NotFoundException('Sesión de caja no encontrada.');
    }
    return session;
  }

  async findSessions(
    schemaName: string,
    query: {
      registerId?: string;
      branchId?: string;
      status?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.CashSessionWhereInput = {};

    if (query.registerId) {
      where.registerId = query.registerId;
    }
    if (query.branchId) {
      where.register = { branchId: query.branchId };
    }
    if (query.status) {
      where.status = query.status as CashSessionStatus;
    }
    if (query.dateFrom || query.dateTo) {
      where.openedAt = {};
      if (query.dateFrom) where.openedAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.openedAt.lte = new Date(query.dateTo);
    }

    const { data, total } = await this.repo.findSessions(schemaName, where, {
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createMovement(
    schemaName: string,
    sessionId: string,
    dto: { type: CashMovementType; amount: number | string; reason: string },
    userId: string,
  ) {
    if (!VALID_MANUAL_MOVEMENT_TYPES.has(dto.type)) {
      throw new BadRequestException(
        `Tipo de movimiento inválido: ${dto.type}. Tipos permitidos: CASH_IN, CASH_OUT, ADJUSTMENT.`,
      );
    }

    const amount = new Prisma.Decimal(dto.amount);
    if (amount.lte(0)) {
      throw new BadRequestException('El monto debe ser mayor a 0.');
    }

    if (!dto.reason || dto.reason.trim().length === 0) {
      throw new BadRequestException('El motivo (reason) es obligatorio.');
    }

    const session = await this.repo.findSessionById(schemaName, sessionId);
    if (!session) {
      throw new NotFoundException('Sesión de caja no encontrada.');
    }
    if (session.status !== 'OPEN') {
      throw new BadRequestException(
        'La sesión de caja no está abierta.',
      );
    }

    return this.repo.runTransaction(schemaName, async (tx) => {
      const currentSession = await this.repo.findSessionById(
        schemaName,
        sessionId,
        tx,
      );
      if (!currentSession || currentSession.status !== 'OPEN') {
        throw new BadRequestException(
          'La sesión de caja no está abierta.',
        );
      }

      let expectedCash = new Prisma.Decimal(currentSession.expectedCash);
      let manualMovements = new Prisma.Decimal(currentSession.manualMovements);

      if (dto.type === 'CASH_IN') {
        expectedCash = expectedCash.add(amount);
        manualMovements = manualMovements.add(amount);
      } else if (dto.type === 'CASH_OUT') {
        expectedCash = expectedCash.sub(amount);
        manualMovements = manualMovements.add(amount);
      }

      const updated = await this.repo.updateSessionCash(
        schemaName,
        sessionId,
        {
          expectedCash,
          ...(dto.type !== 'ADJUSTMENT' && { manualMovements }),
        },
        currentSession.version,
        tx,
      );

      if (!updated) {
        throw new ConflictException(
          'Conflicto de concurrencia: la sesión fue modificada por otro usuario.',
        );
      }

      await this.repo.createMovement(
        schemaName,
        {
          sessionId,
          type: dto.type,
          amount,
          reason: dto.reason,
          createdBy: userId,
        },
        tx,
      );

      await this.activityLogRepo.create(
        schemaName,
        {
          branchId: this.deriveBranchFromSession(currentSession),
          userId,
          action: 'CASH_MOVEMENT_CREATED',
          entity: 'CASH_MOVEMENT',
          entityId: sessionId,
          changes: JSON.stringify({
            type: dto.type,
            amount: amount.toString(),
            reason: dto.reason,
          }),
        },
        tx,
      );

      return updated;
    });
  }

  async createCount(
    schemaName: string,
    sessionId: string,
    dto: { countedCash: number | string; notes?: string },
    userId: string,
  ) {
    const session = await this.repo.findSessionById(schemaName, sessionId);
    if (!session) {
      throw new NotFoundException('Sesión de caja no encontrada.');
    }
    if (session.status !== 'OPEN') {
      throw new BadRequestException(
        'La sesión de caja no está abierta.',
      );
    }

    const countedCash = new Prisma.Decimal(dto.countedCash);
    const difference = countedCash.sub(new Prisma.Decimal(session.expectedCash));

    return this.repo.runTransaction(schemaName, async (tx) => {
      const count = await this.repo.createCount(
        schemaName,
        {
          sessionId,
          countedCash,
          difference,
          notes: dto.notes,
          createdBy: userId,
        },
        tx,
      );

      await this.activityLogRepo.create(
        schemaName,
        {
          branchId: this.deriveBranchFromSession(session),
          userId,
          action: 'CASH_COUNT_CREATED',
          entity: 'CASH_COUNT',
          entityId: count.id,
          changes: JSON.stringify({
            sessionId,
            countedCash: countedCash.toString(),
            difference: difference.toString(),
          }),
        },
        tx,
      );

      return count;
    });
  }

  async closeSession(
    schemaName: string,
    sessionId: string,
    dto: { countedCash: number | string; version: number },
    userId: string,
  ) {
    const session = await this.repo.findSessionById(schemaName, sessionId);
    if (!session) {
      throw new NotFoundException('Sesión de caja no encontrada.');
    }
    if (session.status !== 'OPEN') {
      throw new BadRequestException(
        'La sesión de caja no está abierta.',
      );
    }
    if (session.version !== dto.version) {
      throw new ConflictException(
        'Conflicto de concurrencia: la sesión fue modificada por otro usuario.',
      );
    }

    const countedCash = new Prisma.Decimal(dto.countedCash);
    const difference = countedCash.sub(new Prisma.Decimal(session.expectedCash));

    return this.repo.runTransaction(schemaName, async (tx) => {
      await this.repo.createMovement(
        schemaName,
        {
          sessionId,
          type: 'ADJUSTMENT',
          amount: new Prisma.Decimal(0),
          reason: 'Cierre de sesión',
          createdBy: userId,
        },
        tx,
      );

      const closed = await this.repo.updateSessionStatus(
        schemaName,
        sessionId,
        {
          status: 'CLOSED',
          closedBy: userId,
          closedAt: new Date(),
          countedCash,
          difference,
        },
        dto.version,
        tx,
      );

      if (!closed) {
        throw new ConflictException(
          'Conflicto de concurrencia: la sesión fue modificada por otro usuario.',
        );
      }

      await this.activityLogRepo.create(
        schemaName,
        {
          branchId: this.deriveBranchFromSession(session),
          userId,
          action: 'CASH_SESSION_CLOSED',
          entity: 'CASH_SESSION',
          entityId: sessionId,
          changes: JSON.stringify({
            countedCash: countedCash.toString(),
            difference: difference.toString(),
            expectedCash: session.expectedCash.toString(),
          }),
        },
        tx,
      );

      return closed;
    });
  }

  async handlePaymentCompleted(eventData: {
    schemaName: string;
    orderId: string;
    payments: Array<{ id: string; amount: number | string; method: string; status: string }>;
    branchId: string | null;
    userId: string | null;
  }) {
    const { schemaName, orderId } = eventData;

    if (!eventData.branchId || !eventData.userId) {
      this.logger.warn(
        `Missing branchId or userId in payment:completed for order ${orderId}, skipping.`,
      );
      return;
    }

    const { branchId, userId } = eventData;

    const session = await this.repo.findOpenSessionByBranchId(
      schemaName,
      branchId,
    );
    if (!session) {
      this.logger.warn(
        `No open session for branch ${branchId}, skipping payment sync.`,
      );
      return;
    }

    const cashPayments = eventData.payments.filter(
      (p) => p.method === 'CASH' && p.status === 'COMPLETED',
    );
    if (cashPayments.length === 0) return;

    await this.repo.runTransaction(schemaName, async (tx) => {
      let currentSession = await this.repo.findSessionById(
        schemaName,
        session.id,
        tx,
      );
      if (!currentSession || currentSession.status !== 'OPEN') {
        this.logger.warn(
          `Session ${session.id} is no longer open, skipping payment sync.`,
        );
        return;
      }

      for (const payment of cashPayments) {
        const amount = new Prisma.Decimal(payment.amount);

        try {
          await this.repo.createMovement(
            schemaName,
            {
              sessionId: session.id,
              type: 'CASH_PAYMENT',
              amount,
              reason: `Pago orden ${orderId}`,
              referenceId: payment.id,
              createdBy: userId,
            },
            tx,
          );
        } catch (err: any) {
          if (err?.code === 'P2002') {
            this.logger.warn(
              `Duplicate payment movement for payment ${payment.id}, skipping (idempotent).`,
            );
            continue;
          }
          throw err;
        }

        const updated = await this.repo.updateSessionCash(
          schemaName,
          session.id,
          {
            expectedCash: new Prisma.Decimal(currentSession.expectedCash).add(
              amount,
            ),
            cashPayments: new Prisma.Decimal(currentSession.cashPayments).add(
              amount,
            ),
          },
          currentSession.version,
          tx,
        );

        if (!updated) {
          throw new ConflictException(
            'Conflicto de concurrencia al registrar pago en efectivo.',
          );
        }

        currentSession = updated;
      }

      await this.activityLogRepo.create(
        schemaName,
        {
          branchId,
          userId,
          action: 'CASH_PAYMENT_RECORDED',
          entity: 'CASH_SESSION',
          entityId: session.id,
          changes: JSON.stringify({
            orderId,
            paymentsCount: cashPayments.length,
            totalAmount: cashPayments
              .reduce((sum, p) => sum.add(new Prisma.Decimal(p.amount)), new Prisma.Decimal(0))
              .toString(),
          }),
        },
        tx,
      );
    });
  }

  async handleRefundCompleted(eventData: {
    schemaName: string;
    refundId: string;
    paymentId: string;
    amount: number | string;
    paymentMethod: string;
    status: string;
    branchId: string | null;
    userId: string | null;
    orderId: string;
  }) {
    const { schemaName, refundId, orderId } = eventData;

    if (eventData.paymentMethod !== 'CASH') return;

    if (!eventData.branchId || !eventData.userId) {
      this.logger.warn(
        `Missing branchId or userId in refund:completed for refund ${refundId}, skipping.`,
      );
      return;
    }

    const { branchId, userId } = eventData;

    const session = await this.repo.findOpenSessionByBranchId(
      schemaName,
      branchId,
    );
    if (!session) {
      this.logger.warn(
        `No open session for branch ${branchId}, skipping refund sync.`,
      );
      return;
    }

    await this.repo.runTransaction(schemaName, async (tx) => {
      let currentSession = await this.repo.findSessionById(
        schemaName,
        session.id,
        tx,
      );
      if (!currentSession || currentSession.status !== 'OPEN') {
        this.logger.warn(
          `Session ${session.id} is no longer open, skipping refund sync.`,
        );
        return;
      }

      const amount = new Prisma.Decimal(eventData.amount);

      try {
        await this.repo.createMovement(
          schemaName,
          {
            sessionId: session.id,
            type: 'CASH_REFUND',
            amount,
            reason: `Reembolso orden ${orderId}`,
            referenceId: refundId,
            createdBy: userId,
          },
          tx,
        );
      } catch (err: any) {
        if (err?.code === 'P2002') {
          this.logger.warn(
            `Duplicate refund movement for ${refundId}, skipping (idempotent).`,
          );
          return;
        }
        throw err;
      }

      const updated = await this.repo.updateSessionCash(
        schemaName,
        session.id,
        {
          expectedCash: new Prisma.Decimal(currentSession.expectedCash).sub(
            amount,
          ),
          refunds: new Prisma.Decimal(currentSession.refunds).add(amount),
        },
        currentSession.version,
        tx,
      );

      if (!updated) {
        throw new ConflictException(
          'Conflicto de concurrencia al registrar reembolso en efectivo.',
        );
      }

      await this.activityLogRepo.create(
        schemaName,
        {
          branchId,
          userId,
          action: 'CASH_REFUND_RECORDED',
          entity: 'CASH_SESSION',
          entityId: session.id,
          changes: JSON.stringify({
            refundId,
            orderId,
            amount: amount.toString(),
          }),
        },
        tx,
      );
    });
  }

  private deriveBranchFromSession(session: { register?: { branchId: string } }): string {
    return session.register?.branchId ?? '';
  }
}
