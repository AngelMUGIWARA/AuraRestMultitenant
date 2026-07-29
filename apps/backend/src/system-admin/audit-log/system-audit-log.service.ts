import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SystemAuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  log(params: {
    superAdminId: string;
    action: string;
    targetType: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.systemAuditLog.create({
      data: {
        superAdminId: params.superAdminId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        metadata: params.metadata as any,
      },
    });
  }

  findAll() {
    return this.prisma.systemAuditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  }
}
