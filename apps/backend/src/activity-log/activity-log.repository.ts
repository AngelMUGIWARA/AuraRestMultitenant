import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import type { Prisma } from '../generated/prisma-tenant';

@Injectable()
export class ActivityLogRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  private db(schemaName: string, tx?: Prisma.TransactionClient) {
    return tx ?? this.tenantPrisma.getClient(schemaName);
  }

  async create(
    schemaName: string,
    data: {
      branchId: string;
      userId: string;
      action: string;
      entity: string;
      entityId: string;
      changes?: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(schemaName, tx).activityLog.create({ data });
  }

  async findMany(
    schemaName: string,
    params: {
      where: Prisma.ActivityLogWhereInput;
      orderBy?: Prisma.ActivityLogOrderByWithRelationInput;
      skip?: number;
      take?: number;
    },
  ) {
    return this.db(schemaName).activityLog.findMany({
      ...params,
      include: { branch: true, user: true },
    });
  }

  async count(
    schemaName: string,
    where: Prisma.ActivityLogWhereInput,
  ) {
    return this.db(schemaName).activityLog.count({ where });
  }
}
