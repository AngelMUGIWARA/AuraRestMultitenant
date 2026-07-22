import { ReservationsService } from './reservations.service';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let mockRepo: any;
  let mockActivityLog: any;

  beforeEach(() => {
    mockRepo = {
      findAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
    };
    mockActivityLog = { log: jest.fn() };
    service = new ReservationsService(mockRepo, mockActivityLog);
  });

  describe('findAll - search forwarding', () => {
    it('debe pasar search al repositorio cuando se proporciona', async () => {
      await service.findAll('test_schema', { search: 'Juan' } as any);

      expect(mockRepo.findAll).toHaveBeenCalledWith('test_schema', {
        search: 'Juan',
      });
    });

    it('NO debe pasar search cuando no se proporciona', async () => {
      await service.findAll('test_schema', {} as any);

      expect(mockRepo.findAll).toHaveBeenCalledWith('test_schema', {});
    });

    it('debe combinar search con status y branchId', async () => {
      await service.findAll('test_schema', {
        search: 'test',
        status: 'CONFIRMED',
        branchId: 'branch-001',
      } as any);

      expect(mockRepo.findAll).toHaveBeenCalledWith('test_schema', {
        search: 'test',
        status: 'CONFIRMED',
        branchId: 'branch-001',
      });
    });

    it('debe ignorar search cuando es undefined', async () => {
      await service.findAll('test_schema', { search: undefined } as any);

      const filters = mockRepo.findAll.mock.calls[0][1];
      expect(filters).not.toHaveProperty('search');
    });

    it('debe ignorar search cuando es string vacío', async () => {
      await service.findAll('test_schema', { search: '' } as any);

      const filters = mockRepo.findAll.mock.calls[0][1];
      expect(filters).not.toHaveProperty('search');
    });
  });

  describe('findAll - response structure', () => {
    it('debe retornar data y meta con total', async () => {
      const mockReservations = [{ id: 'r1' }, { id: 'r2' }];
      mockRepo.findAll.mockResolvedValue(mockReservations);

      const result = await service.findAll('test_schema', {} as any);

      expect(result).toEqual({
        data: mockReservations,
        meta: { total: 2 },
      });
    });

    it('debe retornar meta total 0 cuando no hay resultados', async () => {
      mockRepo.findAll.mockResolvedValue([]);

      const result = await service.findAll('test_schema', {
        search: 'nonexistent',
      } as any);

      expect(result).toEqual({
        data: [],
        meta: { total: 0 },
      });
    });
  });
});
