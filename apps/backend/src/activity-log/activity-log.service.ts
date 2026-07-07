import { Injectable } from '@nestjs/common';
import { ActivityLogRepository } from './activity-log.repository';
import { ActivityLogQueryDto } from './dto/activity-log-query.dto';

@Injectable()
export class ActivityLogService {
  constructor(private readonly repo: ActivityLogRepository) {}

  async log(
    schemaName: string,
    params: {
      branchId: string;
      userId: string;
      action: string;
      entity: string;
      entityId: string;
      changes?: string;
    },
    tx?: any,
  ): Promise<void> {
    try {
      await this.repo.create(
        schemaName,
        {
          branchId: params.branchId,
          userId: params.userId,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          changes: params.changes,
        },
        tx,
      );
    } catch {
      // best-effort: no debe romper el flujo principal
    }
  }

  async findAll(
    schemaName: string,
    query: ActivityLogQueryDto,
  ) {
    const where: any = {};

    if (query.branchId) where.branchId = query.branchId;
    if (query.entity) where.entity = query.entity;
    if (query.action) where.action = query.action;
    if (query.userId) where.userId = query.userId;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    const page = query.page || 1;
    const limit = query.limit || 20;

    const [data, total] = await Promise.all([
      this.repo.findMany(schemaName, {
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: limit,
      }),
      this.repo.count(schemaName, where),
    ]);

    return {
      data: data.map((entry) => ({
        id: entry.id,
        branchId: entry.branchId,
        userId: entry.userId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        changes: entry.changes,
        createdAt: entry.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
