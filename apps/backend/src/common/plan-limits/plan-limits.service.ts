import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  LimitedResource,
  PLAN_LIMITS,
  RESOURCE_LABEL,
  RESOURCE_LIMIT_KEY,
} from './plan-limits.config';

@Injectable()
export class PlanLimitsService {
  constructor(private readonly systemDb: PrismaService) {}

  async assertWithinLimit(
    schemaName: string,
    resource: LimitedResource,
    currentCount: number,
  ): Promise<void> {
    const tenant = await this.systemDb.tenant.findUnique({
      where: { schemaName },
      select: { plan: true },
    });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    const limit = PLAN_LIMITS[tenant.plan][RESOURCE_LIMIT_KEY[resource]];
    if (limit === null || currentCount < limit) return;

    throw new ForbiddenException(
      `Tu plan ${tenant.plan} permite hasta ${limit} ${RESOURCE_LABEL[resource]}${limit === 1 ? '' : 's'}. Actualiza tu plan para agregar más.`,
    );
  }
}
