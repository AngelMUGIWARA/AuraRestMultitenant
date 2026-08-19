import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PlanLimitsService } from './plan-limits.service';

describe('PlanLimitsService', () => {
  it('throws when a tenant reaches the FREE plan branch limit', async () => {
    const systemDb = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue({ plan: 'FREE' }),
      },
    } as any;

    const service = new PlanLimitsService(systemDb);

    await expect(
      service.assertWithinLimit('demo_tenant', 'branches', 1),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows creation when current count is below the limit', async () => {
    const systemDb = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue({ plan: 'PRO' }),
      },
    } as any;

    const service = new PlanLimitsService(systemDb);

    await expect(
      service.assertWithinLimit('demo_tenant', 'branches', 1),
    ).resolves.toBeUndefined();
  });

  it('throws when the tenant cannot be found', async () => {
    const systemDb = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    } as any;

    const service = new PlanLimitsService(systemDb);

    await expect(
      service.assertWithinLimit('missing_tenant', 'staff', 0),
    ).rejects.toThrow(NotFoundException);
  });
});
