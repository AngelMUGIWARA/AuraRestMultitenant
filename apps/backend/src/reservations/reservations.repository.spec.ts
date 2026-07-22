import { ReservationRepository } from './reservations.repository';

describe('ReservationRepository', () => {
  let repo: ReservationRepository;
  let mockGetClient: jest.Mock;

  beforeEach(() => {
    mockGetClient = jest.fn();
    repo = new ReservationRepository({ getClient: mockGetClient } as any);
  });

  describe('findAll - search filter', () => {
    it('debe buscar por guestName, guestPhone y guestEmail (no confirmationCode)', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      mockGetClient.mockReturnValue({ reservation: { findMany: mockFindMany } });

      await repo.findAll('test_schema', { search: 'Juan' });

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { guestName: { contains: 'Juan', mode: 'insensitive' } },
            { guestPhone: { contains: 'Juan', mode: 'insensitive' } },
            { guestEmail: { contains: 'Juan', mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('debe buscar por teléfono correctamente', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      mockGetClient.mockReturnValue({ reservation: { findMany: mockFindMany } });

      await repo.findAll('test_schema', { search: '555-1234' });

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { guestName: { contains: '555-1234', mode: 'insensitive' } },
            { guestPhone: { contains: '555-1234', mode: 'insensitive' } },
            { guestEmail: { contains: '555-1234', mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('NO debe contener confirmationCode en ningún filtro OR', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      mockGetClient.mockReturnValue({ reservation: { findMany: mockFindMany } });

      await repo.findAll('test_schema', { search: 'test' });

      const call = mockFindMany.mock.calls[0][0];
      const orClauses = call.where.OR;

      for (const clause of orClauses) {
        expect(clause).not.toHaveProperty('confirmationCode');
      }
    });

    it('debe ignorar search cuando no se proporciona', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      mockGetClient.mockReturnValue({ reservation: { findMany: mockFindMany } });

      await repo.findAll('test_schema', {});

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
      });
    });

    it('debe ignorar search cuando es string vacío', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      mockGetClient.mockReturnValue({ reservation: { findMany: mockFindMany } });

      await repo.findAll('test_schema', { search: '' });

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
      });
    });

    it('no debe usar findMany cuando search es undefined', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      mockGetClient.mockReturnValue({ reservation: { findMany: mockFindMany } });

      await repo.findAll('test_schema', { search: undefined });

      const call = mockFindMany.mock.calls[0][0];
      expect(call.where).not.toHaveProperty('OR');
    });
  });

  describe('findAll - combined filters', () => {
    it('debe combinar search con branchId y status', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      mockGetClient.mockReturnValue({ reservation: { findMany: mockFindMany } });

      await repo.findAll('test_schema', {
        search: 'María',
        branchId: 'branch-001',
        status: 'pending',
      });

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          branchId: 'branch-001',
          status: 'PENDING',
          OR: [
            { guestName: { contains: 'María', mode: 'insensitive' } },
            { guestPhone: { contains: 'María', mode: 'insensitive' } },
            { guestEmail: { contains: 'María', mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('no debe incluir status cuando es "all"', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      mockGetClient.mockReturnValue({ reservation: { findMany: mockFindMany } });

      await repo.findAll('test_schema', { status: 'all' });

      const call = mockFindMany.mock.calls[0][0];
      expect(call.where).not.toHaveProperty('status');
    });
  });
});
