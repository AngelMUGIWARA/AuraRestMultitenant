import { OrdersService } from './orders.service';

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
