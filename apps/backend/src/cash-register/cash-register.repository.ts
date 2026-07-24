import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import type { Prisma } from '../generated/prisma-tenant';
import type { CashMovementType, CashSessionStatus } from '../generated/prisma-tenant';

const SESSION_INCLUDE = {
  register: true,
  opener: { select: { id: true, name: true, email: true } },
  closer: { select: { id: true, name: true, email: true } },
  movements: { orderBy: { createdAt: 'asc' as const } },
  counts: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.CashSessionInclude;

@Injectable()
export class CashRegisterRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  private db(schemaName: string, tx?: Prisma.TransactionClient) {
    return tx ?? this.tenantPrisma.getClient(schemaName);
  }

  async runTransaction<T>(
    schemaName: string,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.tenantPrisma.getClient(schemaName).$transaction(fn);
  }

  async createRegister(
    schemaName: string,
    data: { branchId: string; name: string },
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).cashRegister.create({ data });
  }

  async findRegisterById(
    schemaName: string,
    id: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).cashRegister.findUnique({
      where: { id },
      include: { sessions: { orderBy: { openedAt: 'desc' }, take: 5 } },
    });
  }

  async findRegisters(
    schemaName: string,
    where: Prisma.CashRegisterWhereInput,
  ) {
    return this.db(schemaName).cashRegister.findMany({
      where,
      include: { sessions: { orderBy: { openedAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOpenSessionByRegisterId(
    schemaName: string,
    registerId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).cashSession.findFirst({
      where: { registerId, status: 'OPEN' },
      include: SESSION_INCLUDE,
    });
  }

  async findSessionById(
    schemaName: string,
    id: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).cashSession.findUnique({
      where: { id },
      include: SESSION_INCLUDE,
    });
  }

  async findSessions(
    schemaName: string,
    where: Prisma.CashSessionWhereInput,
    pagination: { skip: number; take: number },
  ) {
    const [data, total] = await Promise.all([
      this.db(schemaName).cashSession.findMany({
        where,
        include: SESSION_INCLUDE,
        orderBy: { openedAt: 'desc' },
        ...pagination,
      }),
      this.db(schemaName).cashSession.count({ where }),
    ]);
    return { data, total };
  }

  async createSession(
    schemaName: string,
    data: {
      registerId: string;
      openedBy: string;
      openingFloat: Prisma.Decimal;
    },
    tx: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).cashSession.create({
      data: {
        registerId: data.registerId,
        openedBy: data.openedBy,
        openingFloat: data.openingFloat,
        expectedCash: data.openingFloat,
      },
      include: SESSION_INCLUDE,
    });
  }

  async updateSessionStatus(
    schemaName: string,
    id: string,
    data: {
      status: CashSessionStatus;
      closedBy?: string;
      closedAt?: Date;
      countedCash?: Prisma.Decimal;
      difference?: Prisma.Decimal;
      totalPayments?: Prisma.Decimal;
      cashPayments?: Prisma.Decimal;
      refunds?: Prisma.Decimal;
      manualMovements?: Prisma.Decimal;
    },
    expectedVersion: number,
    tx: Prisma.TransactionClient,
  ) {
    const updateData: Prisma.CashSessionUncheckedUpdateManyInput = {
      status: data.status,
      ...(data.closedBy !== undefined && { closedBy: data.closedBy }),
      ...(data.closedAt !== undefined && { closedAt: data.closedAt }),
      ...(data.countedCash !== undefined && { countedCash: data.countedCash }),
      ...(data.difference !== undefined && { difference: data.difference }),
      ...(data.totalPayments !== undefined && { totalPayments: data.totalPayments }),
      ...(data.cashPayments !== undefined && { cashPayments: data.cashPayments }),
      ...(data.refunds !== undefined && { refunds: data.refunds }),
      ...(data.manualMovements !== undefined && { manualMovements: data.manualMovements }),
      version: { increment: 1 },
    };

    const result = await this.db(schemaName, tx).cashSession.updateMany({
      where: { id, version: expectedVersion },
      data: updateData,
    });
    if (result.count === 0) return null;
    return this.db(schemaName, tx).cashSession.findUnique({
      where: { id },
      include: SESSION_INCLUDE,
    });
  }

  async updateSessionCash(
    schemaName: string,
    id: string,
    data: {
      expectedCash: Prisma.Decimal;
      cashPayments?: Prisma.Decimal;
      refunds?: Prisma.Decimal;
      manualMovements?: Prisma.Decimal;
    },
    expectedVersion: number,
    tx: Prisma.TransactionClient,
  ) {
    const result = await this.db(schemaName, tx).cashSession.updateMany({
      where: { id, version: expectedVersion },
      data: {
        expectedCash: data.expectedCash,
        ...(data.cashPayments !== undefined && { cashPayments: data.cashPayments }),
        ...(data.refunds !== undefined && { refunds: data.refunds }),
        ...(data.manualMovements !== undefined && { manualMovements: data.manualMovements }),
        version: { increment: 1 },
      },
    });
    if (result.count === 0) return null;
    return this.db(schemaName, tx).cashSession.findUnique({
      where: { id },
      include: SESSION_INCLUDE,
    });
  }

  async createMovement(
    schemaName: string,
    data: {
      sessionId: string;
      type: CashMovementType;
      amount: Prisma.Decimal;
      reason: string;
      referenceId?: string;
      createdBy: string;
    },
    tx: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).cashMovement.create({ data });
  }

  async createCount(
    schemaName: string,
    data: {
      sessionId: string;
      countedCash: Prisma.Decimal;
      difference: Prisma.Decimal;
      notes?: string;
      createdBy: string;
    },
    tx: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).cashCount.create({ data });
  }

  async findSessionWithPayments(
    schemaName: string,
    sessionId: string,
  ) {
    return this.db(schemaName).cashSession.findUnique({
      where: { id: sessionId },
      include: {
        register: true,
        movements: true,
        counts: true,
      },
    });
  }

  async findOpenSessionByBranchId(
    schemaName: string,
    branchId: string,
  ) {
    return this.db(schemaName).cashSession.findFirst({
      where: {
        status: 'OPEN',
        register: { branchId },
      },
      include: SESSION_INCLUDE,
    });
  }
}
