import { OrdersService } from './orders.service';
import { ForbiddenException } from '@nestjs/common';

function buildService(overrides?: Record<string, jest.Mock>) {
  const defaults = {
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    findUserBranchIds: jest.fn().mockResolvedValue([]),
  };
  const repo = { ...defaults, ...overrides };
  const service = new OrdersService(
    repo as any,
    { emit: jest.fn() } as any,
    { log: jest.fn() } as any,
    { getTaxRate: jest.fn().mockResolvedValue(0.16) } as any,
    {} as any,
  );
  return { service, repo };
}

describe('OrdersService.findAll – paymentStatus filter', () => {
  it('PAID → maps to DB enum PAID', async () => {
    const { service, repo } = buildService();
    await service.findAll('tenant', { paymentStatus: 'paid' });
    expect(repo.findMany).toHaveBeenCalledWith(
      'tenant',
      expect.objectContaining({
        where: expect.objectContaining({ paymentStatus: 'PAID' }),
      }),
    );
  });

  it('UNPAID → maps to DB enum UNPAID', async () => {
    const { service, repo } = buildService();
    await service.findAll('tenant', { paymentStatus: 'unpaid' });
    expect(repo.findMany).toHaveBeenCalledWith(
      'tenant',
      expect.objectContaining({
        where: expect.objectContaining({ paymentStatus: 'UNPAID' }),
      }),
    );
  });

  it('PARTIAL → maps to DB enum PARTIALLY_PAID', async () => {
    const { service, repo } = buildService();
    await service.findAll('tenant', { paymentStatus: 'partial' });
    expect(repo.findMany).toHaveBeenCalledWith(
      'tenant',
      expect.objectContaining({
        where: expect.objectContaining({ paymentStatus: 'PARTIALLY_PAID' }),
      }),
    );
  });

  it('case insensitive – PAID (uppercase) maps correctly', async () => {
    const { service, repo } = buildService();
    await service.findAll('tenant', { paymentStatus: 'PAID' });
    expect(repo.findMany).toHaveBeenCalledWith(
      'tenant',
      expect.objectContaining({
        where: expect.objectContaining({ paymentStatus: 'PAID' }),
      }),
    );
  });

  it('invalid value → paymentStatus not added to where', async () => {
    const { service, repo } = buildService();
    await service.findAll('tenant', { paymentStatus: 'bogus' });
    expect(repo.findMany).toHaveBeenCalledWith(
      'tenant',
      expect.objectContaining({
        where: expect.not.objectContaining({ paymentStatus: expect.anything() }),
      }),
    );
  });

  it('no paymentStatus → where does not include paymentStatus', async () => {
    const { service, repo } = buildService();
    await service.findAll('tenant', {});
    expect(repo.findMany).toHaveBeenCalledWith(
      'tenant',
      expect.objectContaining({
        where: expect.not.objectContaining({ paymentStatus: expect.anything() }),
      }),
    );
  });
});

describe('OrdersService.findAll – status active filter', () => {
  const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'READY'];
  const INACTIVE_STATUSES = ['DELIVERED', 'PAID', 'CANCELLED'];

  it('active → where.status uses $in with the 4 active statuses', async () => {
    const { service, repo } = buildService();
    await service.findAll('tenant', { status: 'active' });
    expect(repo.findMany).toHaveBeenCalledWith(
      'tenant',
      expect.objectContaining({
        where: expect.objectContaining({ status: { in: ACTIVE_STATUSES } }),
      }),
    );
  });

  it('active excludes DELIVERED, PAID, CANCELLED', async () => {
    const { service, repo } = buildService();
    await service.findAll('tenant', { status: 'active' });
    const where = repo.findMany.mock.calls[0][1].where;
    for (const s of INACTIVE_STATUSES) {
      expect(where.status.in).not.toContain(s);
    }
  });

  it('active includes exactly PENDING, CONFIRMED, IN_PROGRESS, READY', async () => {
    const { service, repo } = buildService();
    await service.findAll('tenant', { status: 'active' });
    const where = repo.findMany.mock.calls[0][1].where;
    expect(where.status.in).toEqual(ACTIVE_STATUSES);
  });

  it('pending → maps to single DB enum PENDING', async () => {
    const { service, repo } = buildService();
    await service.findAll('tenant', { status: 'pending' });
    expect(repo.findMany).toHaveBeenCalledWith(
      'tenant',
      expect.objectContaining({
        where: expect.objectContaining({ status: 'PENDING' }),
      }),
    );
  });
});

describe('OrdersService.findAll – branch scoping', () => {
  const CASHIER = { id: 'u1', role: 'CASHIER' };
  const MANAGER = { id: 'u1', role: 'MANAGER' };
  const OWNER = { id: 'u1', role: 'OWNER' };
  const WAITER = { id: 'u1', role: 'WAITER' };

  it('1. OWNER can query any branchId explicitly', async () => {
    const { service, repo } = buildService();
    await service.findAll('tenant', { branchId: 'b999' }, OWNER);
    expect(repo.findMany).toHaveBeenCalledWith(
      'tenant',
      expect.objectContaining({
        where: expect.objectContaining({ branchId: 'b999' }),
      }),
    );
  });

  it('2. OWNER without branchId → no branch filter (sees all)', async () => {
    const { service, repo } = buildService();
    await service.findAll('tenant', {}, OWNER);
    expect(repo.findMany).toHaveBeenCalledWith(
      'tenant',
      expect.objectContaining({
        where: expect.not.objectContaining({ branchId: expect.anything() }),
      }),
    );
  });

  it('3. CASHIER with branches [b1,b2] → filters to assigned branches', async () => {
    const { service, repo } = buildService({
      findUserBranchIds: jest.fn().mockResolvedValue(['b1', 'b2']),
    });
    await service.findAll('tenant', {}, CASHIER);
    expect(repo.findMany).toHaveBeenCalledWith(
      'tenant',
      expect.objectContaining({
        where: expect.objectContaining({ branchId: { in: ['b1', 'b2'] } }),
      }),
    );
  });

  it('4. CASHIER with [b1,b2] querying branchId=b1 → allowed', async () => {
    const { service, repo } = buildService({
      findUserBranchIds: jest.fn().mockResolvedValue(['b1', 'b2']),
    });
    await service.findAll('tenant', { branchId: 'b1' }, CASHIER);
    expect(repo.findMany).toHaveBeenCalledWith(
      'tenant',
      expect.objectContaining({
        where: expect.objectContaining({ branchId: 'b1' }),
      }),
    );
  });

  it('5. CASHIER with [b1,b2] querying branchId=b999 → ForbiddenException', async () => {
    const { service } = buildService({
      findUserBranchIds: jest.fn().mockResolvedValue(['b1', 'b2']),
    });
    await expect(
      service.findAll('tenant', { branchId: 'b999' }, CASHIER),
    ).rejects.toThrow(ForbiddenException);
  });

  it('6. CASHIER without branches → returns empty results (no global access)', async () => {
    const { service, repo } = buildService({
      findUserBranchIds: jest.fn().mockResolvedValue([]),
    });
    await service.findAll('tenant', {}, CASHIER);
    expect(repo.findMany).toHaveBeenCalledWith(
      'tenant',
      expect.objectContaining({
        where: expect.objectContaining({ branchId: { in: [] } }),
      }),
    );
  });

  it('7. CASHIER without branches querying explicit branchId → ForbiddenException', async () => {
    const { service } = buildService({
      findUserBranchIds: jest.fn().mockResolvedValue([]),
    });
    await expect(
      service.findAll('tenant', { branchId: 'b1' }, CASHIER),
    ).rejects.toThrow(ForbiddenException);
  });

  it('8. MANAGER with [b1] querying branchId=b1 → allowed', async () => {
    const { service, repo } = buildService({
      findUserBranchIds: jest.fn().mockResolvedValue(['b1']),
    });
    await service.findAll('tenant', { branchId: 'b1' }, MANAGER);
    expect(repo.findMany).toHaveBeenCalledWith(
      'tenant',
      expect.objectContaining({
        where: expect.objectContaining({ branchId: 'b1' }),
      }),
    );
  });

  it('9. MANAGER with [b1] querying branchId=b2 → ForbiddenException', async () => {
    const { service } = buildService({
      findUserBranchIds: jest.fn().mockResolvedValue(['b1']),
    });
    await expect(
      service.findAll('tenant', { branchId: 'b2' }, MANAGER),
    ).rejects.toThrow(ForbiddenException);
  });

  it('10. WAITER without branches querying branchId → ForbiddenException', async () => {
    const { service } = buildService({
      findUserBranchIds: jest.fn().mockResolvedValue([]),
    });
    await expect(
      service.findAll('tenant', { branchId: 'b1' }, WAITER),
    ).rejects.toThrow(ForbiddenException);
  });

  it('11. no user provided → no branch filter applied', async () => {
    const { service, repo } = buildService();
    await service.findAll('tenant', {});
    expect(repo.findMany).toHaveBeenCalledWith(
      'tenant',
      expect.objectContaining({
        where: expect.not.objectContaining({ branchId: expect.anything() }),
      }),
    );
  });
});

describe('OrdersService.getStats – branch scoping', () => {
  const CASHIER = { id: 'u1', role: 'CASHIER' };
  const OWNER = { id: 'u1', role: 'OWNER' };

  it('CASHIER with [b1,b2] querying branchId=b999 → ForbiddenException', async () => {
    const { service } = buildService({
      findUserBranchIds: jest.fn().mockResolvedValue(['b1', 'b2']),
    });
    await expect(
      service.getStats('tenant', 'b999', CASHIER),
    ).rejects.toThrow(ForbiddenException);
  });

  it('OWNER querying any branchId → allowed', async () => {
    const { service } = buildService();
    const stats = await service.getStats('tenant', 'b999', OWNER);
    expect(stats).toBeDefined();
  });

  it('CASHIER with [b1,b2] no branchId → scope filters automatically', async () => {
    const { service, repo } = buildService({
      findUserBranchIds: jest.fn().mockResolvedValue(['b1', 'b2']),
    });
    await service.getStats('tenant', undefined, CASHIER);
    expect(repo.count).toHaveBeenCalledWith(
      'tenant',
      expect.objectContaining({ branchId: { in: ['b1', 'b2'] } }),
    );
  });
});
