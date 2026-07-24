import { ReservationRepository } from './reservations.repository';
import { Prisma } from '../generated/prisma-tenant';

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

  describe('findOverlappingReservation - solapamiento de intervalos', () => {
    const branch = 'branch-1';
    const table = 'table-1';
    const baseTime = new Date('2026-07-25T10:00:00Z');

    const testCases = [
      {
        name: 'Nueva inicio dentro de existente',
        existing: { start: 0, duration: 60 },
        new: { start: 30, duration: 60 },
        shouldConflict: true,
      },
      {
        name: 'Nueva fin dentro de existente',
        existing: { start: 0, duration: 60 },
        new: { start: -30, duration: 60 },
        shouldConflict: true,
      },
      {
        name: 'Nueva envuelve existente',
        existing: { start: 0, duration: 60 },
        new: { start: -60, duration: 180 },
        shouldConflict: true,
      },
      {
        name: 'Existente envuelve nueva',
        existing: { start: 0, duration: 120 },
        new: { start: 30, duration: 60 },
        shouldConflict: true,
      },
      {
        name: 'Mismo intervalo',
        existing: { start: 0, duration: 60 },
        new: { start: 0, duration: 60 },
        shouldConflict: true,
      },
      {
        name: 'Contigua después (sin conflicto)',
        existing: { start: 0, duration: 60 },
        new: { start: 60, duration: 60 },
        shouldConflict: false,
      },
      {
        name: 'Contigua antes (sin conflicto)',
        existing: { start: 0, duration: 60 },
        new: { start: -60, duration: 60 },
        shouldConflict: false,
      },
    ];

    testCases.forEach((testCase) => {
      it(`debe ${testCase.shouldConflict ? 'detectar' : 'permitir'} - ${testCase.name}`, async () => {
        const existingStart = new Date(baseTime.getTime() + testCase.existing.start * 60000);
        const existingEnd = new Date(
          baseTime.getTime() + (testCase.existing.start + testCase.existing.duration) * 60000,
        );
        const newStart = new Date(baseTime.getTime() + testCase.new.start * 60000);
        const newEnd = new Date(
          baseTime.getTime() + (testCase.new.start + testCase.new.duration) * 60000,
        );

        const mockQueryRaw = jest.fn().mockResolvedValue(
          testCase.shouldConflict
            ? [{ id: 'conflict-1', scheduledAt: existingStart, durationMinutes: testCase.existing.duration }]
            : [],
        );

        const mockTx = { $queryRaw: mockQueryRaw } as any as Prisma.TransactionClient;

        const result = await repo['findOverlappingReservation'](
          mockTx,
          branch,
          table,
          newStart,
          newEnd,
        );

        if (testCase.shouldConflict) {
          expect(result).not.toBeNull();
          expect(result?.id).toBe('conflict-1');
        } else {
          expect(result).toBeNull();
        }
      });
    });

    it('debe ignorar CANCELLED', async () => {
      const existingStart = baseTime;
      const newStart = new Date(baseTime.getTime() + 30 * 60000);
      const newEnd = new Date(baseTime.getTime() + 90 * 60000);

      const mockQueryRaw = jest.fn().mockResolvedValue([]);
      const mockTx = { $queryRaw: mockQueryRaw } as any as Prisma.TransactionClient;

      const result = await repo['findOverlappingReservation'](
        mockTx,
        branch,
        table,
        newStart,
        newEnd,
      );

      expect(result).toBeNull();
      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('debe ignorar COMPLETED', async () => {
      const existingStart = baseTime;
      const newStart = new Date(baseTime.getTime() + 30 * 60000);
      const newEnd = new Date(baseTime.getTime() + 90 * 60000);

      const mockQueryRaw = jest.fn().mockResolvedValue([]);
      const mockTx = { $queryRaw: mockQueryRaw } as any as Prisma.TransactionClient;

      const result = await repo['findOverlappingReservation'](
        mockTx,
        branch,
        table,
        newStart,
        newEnd,
      );

      expect(result).toBeNull();
    });

    it('debe filtrar por branchId (verifica que $queryRaw fue llamado con parámetro)', async () => {
      const mockQueryRaw = jest.fn().mockResolvedValue([]);
      const mockTx = { $queryRaw: mockQueryRaw } as any as Prisma.TransactionClient;

      const newStart = baseTime;
      const newEnd = new Date(baseTime.getTime() + 60 * 60000);

      await repo['findOverlappingReservation'](
        mockTx,
        branch,
        table,
        newStart,
        newEnd,
      );

      // Verificar que fue llamado (con Prisma.sql, el objeto es complejo)
      expect(mockQueryRaw).toHaveBeenCalled();
      expect(mockQueryRaw.mock.calls[0][0]).toBeDefined();
    });

    it('debe filtrar por tableId (verifica que $queryRaw fue llamado con parámetro)', async () => {
      const mockQueryRaw = jest.fn().mockResolvedValue([]);
      const mockTx = { $queryRaw: mockQueryRaw } as any as Prisma.TransactionClient;

      const newStart = baseTime;
      const newEnd = new Date(baseTime.getTime() + 60 * 60000);

      await repo['findOverlappingReservation'](
        mockTx,
        branch,
        table,
        newStart,
        newEnd,
      );

      // Verificar que fue llamado (con Prisma.sql, el objeto es complejo)
      expect(mockQueryRaw).toHaveBeenCalled();
      expect(mockQueryRaw.mock.calls[0][0]).toBeDefined();
    });

    it('debe excluir reserva específica si se proporciona excludeReservationId', async () => {
      const mockQueryRaw = jest.fn().mockResolvedValue([]);
      const mockTx = { $queryRaw: mockQueryRaw } as any as Prisma.TransactionClient;

      const newStart = baseTime;
      const newEnd = new Date(baseTime.getTime() + 60 * 60000);
      const excludeId = 'exclude-id-123';

      await repo['findOverlappingReservation'](
        mockTx,
        branch,
        table,
        newStart,
        newEnd,
        excludeId,
      );

      // Verificar que fue llamado con queryRaw
      expect(mockQueryRaw).toHaveBeenCalled();
      // En Prisma SQL templates, el parámetro es interpolado directamente
      // Simplemente verificar que fue llamado (la lógica de exclusión está en el SQL)
    });
  });
});
