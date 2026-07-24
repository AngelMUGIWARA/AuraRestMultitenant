import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsService } from './reservations.service';
import { ReservationRepository } from './reservations.repository';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ReservationStatus } from '../generated/prisma-tenant';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let repository: jest.Mocked<ReservationRepository>;
  let activityLog: jest.Mocked<ActivityLogService>;
  let tenantPrisma: jest.Mocked<TenantPrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        {
          provide: ReservationRepository,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            updateStatus: jest.fn(),
          },
        },
        {
          provide: ActivityLogService,
          useValue: {
            log: jest.fn(),
          },
        },
        {
          provide: TenantPrismaService,
          useValue: {
            getClient: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
    repository = module.get(ReservationRepository) as jest.Mocked<ReservationRepository>;
    activityLog = module.get(ActivityLogService) as jest.Mocked<ActivityLogService>;
    tenantPrisma = module.get(TenantPrismaService) as jest.Mocked<TenantPrismaService>;
  });

  describe('create', () => {
    const mockUser = { id: 'user-1', role: 'MANAGER', branchId: 'branch-1' };
    const mockDto = {
      guestName: 'Juan',
      guestPhone: '5512345678',
      guestEmail: 'juan@example.com',
      partySize: 4,
      date: '2026-07-25',
      time: '19:00',
      durationMinutes: 60,
      tableId: 'table-1',
      branchId: 'branch-1',
    };
    const mockReservation = {
      id: 'res-1',
      guestName: mockDto.guestName,
      guestPhone: mockDto.guestPhone,
      guestEmail: mockDto.guestEmail,
      partySize: mockDto.partySize,
      scheduledAt: new Date(`${mockDto.date}T${mockDto.time}:00.000Z`),
      durationMinutes: mockDto.durationMinutes,
      status: ReservationStatus.PENDING,
      branchId: mockDto.branchId,
      tableId: mockDto.tableId,
      notes: null,
      userId: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a reservation', async () => {
      repository.create.mockResolvedValue(mockReservation);
      const result = await service.create(mockDto, 'schema-1', 'user-1', mockUser);

      expect(repository.create).toHaveBeenCalledWith(mockDto, 'schema-1', 'user-1');
      expect(result).toHaveProperty('id', 'res-1');
      expect(result).toHaveProperty('date', '2026-07-25');
      expect(result).toHaveProperty('time', '19:00');
    });

    it('should reject if user lacks branch access', async () => {
      const otherBranchUser = { id: 'user-2', role: 'MANAGER', branchId: 'branch-2' };
      await expect(
        service.create(mockDto, 'schema-1', 'user-1', otherBranchUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow OWNER to create in any branch', async () => {
      const ownerUser = { id: 'user-admin', role: 'OWNER', branchId: 'branch-1' };
      repository.create.mockResolvedValue(mockReservation);
      await service.create(mockDto, 'schema-1', 'user-admin', ownerUser);
      expect(repository.create).toHaveBeenCalled();
    });

    it('should register activity log', async () => {
      repository.create.mockResolvedValue(mockReservation);
      await service.create(mockDto, 'schema-1', 'user-1', mockUser);
      expect(activityLog.log).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    const mockUser = { id: 'user-1', role: 'MANAGER', branchId: 'branch-1' };
    const mockReservations = [
      {
        id: 'res-1',
        guestName: 'Juan',
        guestPhone: '5512345678',
        guestEmail: 'juan@example.com',
        status: ReservationStatus.CONFIRMED,
        branchId: 'branch-1',
        tableId: 'table-1',
        partySize: 4,
        scheduledAt: new Date(),
        durationMinutes: 60,
        userId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('should list reservations', async () => {
      repository.findAll.mockResolvedValue(mockReservations);
      const result = await service.findAll('schema-1', {}, mockUser);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should auto-filter by user branch for limited roles', async () => {
      repository.findAll.mockResolvedValue([]);
      await service.findAll('schema-1', { status: 'CONFIRMED' }, mockUser);

      expect(repository.findAll).toHaveBeenCalledWith('schema-1', {
        status: ReservationStatus.CONFIRMED,
        branchId: 'branch-1',
      });
    });

    it('should reject if limited role user has no branch', async () => {
      const noBranchUser = { id: 'user-1', role: 'CASHIER', branchId: undefined };
      await expect(
        service.findAll('schema-1', {}, noBranchUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    const mockUser = { id: 'user-1', role: 'MANAGER', branchId: 'branch-1' };
    const mockReservation = {
      id: 'res-1',
      guestName: 'Juan',
      guestPhone: '5512345678',
      guestEmail: 'juan@example.com',
      branchId: 'branch-1',
      tableId: 'table-1',
      partySize: 4,
      scheduledAt: new Date(),
      durationMinutes: 60,
      status: ReservationStatus.CONFIRMED,
      userId: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should find a reservation by id', async () => {
      repository.findById.mockResolvedValue(mockReservation);
      const result = await service.findOne('res-1', 'schema-1', mockUser);
      expect(result.id).toBe('res-1');
    });

    it('should reject if not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(
        service.findOne('res-1', 'schema-1', mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should enforce branch scope', async () => {
      repository.findById.mockResolvedValue(mockReservation);
      const otherBranchUser = { id: 'user-2', role: 'MANAGER', branchId: 'branch-2' };
      await expect(
        service.findOne('res-1', 'schema-1', otherBranchUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateStatus', () => {
    const mockUser = { id: 'user-1', role: 'CASHIER', branchId: 'branch-1' };
    const mockReservation = {
      id: 'res-1',
      status: ReservationStatus.CONFIRMED,
      branchId: 'branch-1',
      tableId: 'table-1',
      guestName: 'Juan',
      guestPhone: '5512345678',
      guestEmail: 'juan@example.com',
      partySize: 4,
      scheduledAt: new Date(),
      durationMinutes: 60,
      userId: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should update status', async () => {
      repository.findById.mockResolvedValue(mockReservation);
      repository.updateStatus.mockResolvedValue({ ...mockReservation, status: 'ARRIVED' });

      const result = await service.updateStatus('res-1', 'ARRIVED', 'schema-1', 'user-1', mockUser);
      expect(result.status).toBe('ARRIVED');
    });

    it('should reject if not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(
        service.updateStatus('res-1', 'ARRIVED', 'schema-1', 'user-1', mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should enforce branch scope on status update', async () => {
      repository.findById.mockResolvedValue(mockReservation);
      const otherBranchUser = { id: 'user-2', role: 'CASHIER', branchId: 'branch-2' };
      await expect(
        service.updateStatus('res-1', 'ARRIVED', 'schema-1', 'user-1', otherBranchUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getStats', () => {
    const mockUser = { id: 'user-1', role: 'MANAGER', branchId: 'branch-1' };
    const mockReservations = [
      {
        status: ReservationStatus.CONFIRMED,
        partySize: 4,
        branchId: 'branch-1',
      },
      {
        status: ReservationStatus.ARRIVED,
        partySize: 6,
        branchId: 'branch-1',
      },
    ];

    it('should calculate stats', async () => {
      repository.findAll.mockResolvedValue(mockReservations as any);
      const result = await service.getStats('schema-1', undefined, mockUser);

      expect(result.data.totalToday).toBe(2);
      expect(result.data.confirmedToday).toBe(1);
      expect(result.data.arrivedToday).toBe(1);
      expect(result.data.averagePartySize).toBe(5);
    });

    it('should enforce branch scope on stats', async () => {
      repository.findAll.mockResolvedValue([]);
      const noBranchUser = { id: 'user-1', role: 'WAITER', branchId: undefined };
      await expect(
        service.getStats('schema-1', undefined, noBranchUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
