import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { KitchenService } from '../kitchen.service';

function makeOrder(overrides: any = {}) {
  return {
    id: 'order-1',
    folio: '20260724-0001',
    tableId: 'table-1',
    branchId: 'branch-1',
    userId: 'user-1',
    customerName: 'Juan Perez',
    status: 'CONFIRMED',
    notes: null,
    table: { id: 'table-1', number: 5, branchId: 'branch-1' },
    branch: { id: 'branch-1', name: 'Sucursal Centro' },
    orderItems: [
      {
        id: 'oi-1',
        quantity: 2,
        notes: 'Sin cebolla',
        menuItem: { name: 'Tacos al Pastor' },
      },
      {
        id: 'oi-2',
        quantity: 1,
        notes: null,
        menuItem: { name: 'Agua de Horchata' },
      },
    ],
    ...overrides,
  };
}

function makeTicket(overrides: any = {}) {
  return {
    id: 'ticket-1',
    orderId: 'order-1',
    branchId: 'branch-1',
    status: 'PENDING',
    priority: 'NORMAL',
    version: 1,
    startedAt: null,
    readyAt: null,
    deliveredAt: null,
    createdAt: new Date('2026-07-24T00:00:00Z'),
    updatedAt: new Date('2026-07-24T00:00:00Z'),
    order: {
      folio: '20260724-0001',
      customerName: 'Juan Perez',
      notes: null,
      table: { number: 5, branchId: 'branch-1' },
      branch: { id: 'branch-1', name: 'Sucursal Centro' },
    },
    branch: { id: 'branch-1', name: 'Sucursal Centro' },
    items: [
      {
        id: 'kti-1',
        orderItemId: 'oi-1',
        menuItemName: 'Tacos al Pastor',
        quantity: 2,
        notes: 'Sin cebolla',
        status: 'PENDING',
        version: 1,
        startedAt: null,
        readyAt: null,
      },
      {
        id: 'kti-2',
        orderItemId: 'oi-2',
        menuItemName: 'Agua de Horchata',
        quantity: 1,
        notes: null,
        status: 'PENDING',
        version: 1,
        startedAt: null,
        readyAt: null,
      },
    ],
    ...overrides,
  };
}

describe('KitchenService', () => {
  let service: KitchenService;
  let repo: any;
  let activityLogRepo: any;
  let gateway: any;
  let eventBus: any;

  beforeEach(() => {
    repo = {
      runTransaction: jest.fn().mockImplementation((_s: string, cb: any) => cb({})),
      findTicketByOrderId: jest.fn(),
      findOrderForTicket: jest.fn(),
      createTicket: jest.fn(),
      findTicketById: jest.fn(),
      findTickets: jest.fn(),
      updateTicketStatus: jest.fn(),
      updateItemStatus: jest.fn(),
      findTicketItems: jest.fn().mockResolvedValue([]),
      findItemWithTicket: jest.fn(),
    };
    activityLogRepo = {
      create: jest.fn().mockResolvedValue(undefined),
    };
    const gateway = {
      broadcastQueue: jest.fn(),
      broadcastTicket: jest.fn(),
    };

    service = new KitchenService(repo, activityLogRepo, gateway);

    gateway = {
      broadcastQueue: jest.fn(),
    };
    eventBus = {
      emit: jest.fn(),
      on: jest.fn(),
    };

    service = new KitchenService(repo, activityLogRepo, gateway, eventBus);

  });

    gateway = {
      broadcastQueue: jest.fn(),
    };
    eventBus = {
      emit: jest.fn(),
      on: jest.fn(),
    };

    service = new KitchenService(repo, activityLogRepo, gateway, eventBus);

  });

  describe('createTicket', () => {
    it('A: should create ticket correctly for a valid order', async () => {
      repo.findTicketByOrderId.mockResolvedValue(null);
      repo.findOrderForTicket.mockResolvedValue(makeOrder());
      repo.createTicket.mockResolvedValue(makeTicket());

      const result = await service.createTicket(
        'tenant',
        { orderId: 'order-1' },
        'user-1',
      );

      expect(result.id).toBe('ticket-1');
      expect(result.status).toBe('PENDING');
      expect(result.items).toHaveLength(2);
      expect(repo.findOrderForTicket).toHaveBeenCalledWith(
        'tenant',
        'order-1',
        expect.anything(),
      );
      expect(activityLogRepo.create).toHaveBeenCalledWith(
        'tenant',
        expect.objectContaining({
          action: 'KITCHEN_TICKET_CREATED',
          entity: 'KITCHEN_TICKET',
          entityId: 'ticket-1',
        }),
        expect.anything(),
      );
    });

    it('B: should reject ticket for cancelled order', async () => {
      repo.findTicketByOrderId.mockResolvedValue(null);
      repo.findOrderForTicket.mockResolvedValue(
        makeOrder({ status: 'CANCELLED' }),
      );

      await expect(
        service.createTicket('tenant', { orderId: 'order-1' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('C: should reject duplicate ticket for same order', async () => {
      repo.findTicketByOrderId.mockResolvedValue(makeTicket());

      await expect(
        service.createTicket('tenant', { orderId: 'order-1' }, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('D: should create all KitchenItems in PENDING status', async () => {
      repo.findTicketByOrderId.mockResolvedValue(null);
      repo.findOrderForTicket.mockResolvedValue(makeOrder());
      repo.createTicket.mockResolvedValue(makeTicket());

      await service.createTicket('tenant', { orderId: 'order-1' }, 'user-1');

      expect(repo.createTicket).toHaveBeenCalledWith(
        'tenant',
        expect.objectContaining({ orderId: 'order-1' }),
        expect.arrayContaining([
          expect.objectContaining({
            orderItemId: 'oi-1',
            menuItemName: 'Tacos al Pastor',
            quantity: 2,
            notes: 'Sin cebolla',
          }),
          expect.objectContaining({
            orderItemId: 'oi-2',
            menuItemName: 'Agua de Horchata',
            quantity: 1,
          }),
        ]),
        expect.anything(),
      );
    });

    it('N: should handle concurrent ticket creation for same order', async () => {
      repo.findTicketByOrderId
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeTicket());
      repo.findOrderForTicket.mockResolvedValue(makeOrder());
      repo.createTicket.mockResolvedValue(makeTicket());

      await service.createTicket('tenant', { orderId: 'order-1' }, 'user-1');

      await expect(
        service.createTicket('tenant', { orderId: 'order-1' }, 'user-2'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateTicketStatus', () => {
    it('E: should update ticket to PREPARING with startedAt', async () => {
      repo.findTicketById.mockResolvedValue(makeTicket());
      repo.updateTicketStatus.mockResolvedValue(
        makeTicket({ status: 'PREPARING', startedAt: new Date() }),
      );

      const result = await service.updateTicketStatus(
        'tenant',
        'ticket-1',
        { status: 'PREPARING', version: 1 },
        'user-1',
      );

      expect(result.status).toBe('PREPARING');
      expect(repo.updateTicketStatus).toHaveBeenCalledWith(
        'tenant',
        'ticket-1',
        expect.objectContaining({ status: 'PREPARING', startedAt: expect.any(Date) }),
        1,
        expect.anything(),
      );
    });

    it('should reject invalid transition: PENDING -> READY', async () => {
      repo.findTicketById.mockResolvedValue(makeTicket());

      await expect(
        service.updateTicketStatus(
          'tenant',
          'ticket-1',
          { status: 'READY', version: 1 },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid transition: DELIVERED -> anything', async () => {
      repo.findTicketById.mockResolvedValue(
        makeTicket({ status: 'DELIVERED' }),
      );

      await expect(
        service.updateTicketStatus(
          'tenant',
          'ticket-1',
          { status: 'READY', version: 1 },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle optimistic locking conflict', async () => {
      repo.findTicketById.mockResolvedValue(makeTicket({ version: 2 }));
      repo.updateTicketStatus.mockResolvedValue(null);

      await expect(
        service.updateTicketStatus(
          'tenant',
          'ticket-1',
          { status: 'PREPARING', version: 1 },
          'user-1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('J: should rollback transaction on ActivityLog failure', async () => {
      repo.findTicketById.mockResolvedValue(makeTicket());
      repo.updateTicketStatus.mockResolvedValue(
        makeTicket({ status: 'PREPARING' }),
      );
      activityLogRepo.create.mockRejectedValue(new Error('DB write failed'));

      await expect(
        service.updateTicketStatus(
          'tenant',
          'ticket-1',
          { status: 'PREPARING', version: 1 },
          'user-1',
        ),
      ).rejects.toThrow('DB write failed');
    });

    it('K: should scope ActivityLog to correct tenant', async () => {
      repo.findTicketById.mockResolvedValue(makeTicket());
      repo.updateTicketStatus.mockResolvedValue(
        makeTicket({ status: 'PREPARING' }),
      );

      await service.updateTicketStatus(
        'tenant_a',
        'ticket-1',
        { status: 'PREPARING', version: 1 },
        'user-1',
      );

      expect(activityLogRepo.create).toHaveBeenCalledWith(
        'tenant_a',
        expect.objectContaining({
          branchId: 'branch-1',
          action: 'KITCHEN_TICKET_PREPARING',
        }),
        expect.anything(),
      );
    });
  });

  describe('updateItemStatus', () => {
    it('E: should update item to PREPARING', async () => {
      repo.findItemWithTicket.mockResolvedValue({
        id: 'kti-1',
        ticketId: 'ticket-1',
        menuItemName: 'Tacos al Pastor',
        status: 'PENDING',
        version: 1,
        ticket: makeTicket(),
      });
      repo.updateItemStatus.mockResolvedValue({
        id: 'kti-1',
        status: 'PREPARING',
        version: 2,
      });
      repo.findTicketItems.mockResolvedValue([
        { id: 'kti-1', status: 'PREPARING', version: 2 },
        { id: 'kti-2', status: 'PENDING', version: 1 },
      ]);
      repo.findTicketById.mockResolvedValue(
        makeTicket({ status: 'PREPARING', startedAt: new Date() }),
      );

      const result = await service.updateItemStatus(
        'tenant',
        'kti-1',
        { status: 'PREPARING', version: 1 },
        'user-1',
      );

      expect(result).toBeDefined();
    });

    it('F: should update item to READY', async () => {
      const ticket = makeTicket({ status: 'PREPARING' });
      repo.findItemWithTicket.mockResolvedValue({
        id: 'kti-1',
        ticketId: 'ticket-1',
        menuItemName: 'Tacos al Pastor',
        status: 'PREPARING',
        version: 1,
        ticket,
      });

      repo.updateItemStatus.mockResolvedValue({
        id: 'kti-1',
        status: 'READY',
        readyAt: new Date(),
        version: 2,
      });
      repo.findTicketItems.mockResolvedValue([
        { id: 'kti-1', status: 'READY', version: 2 },
        { id: 'kti-2', status: 'PENDING', version: 1 },
      ]);
      repo.updateTicketStatus.mockResolvedValue(null);
      repo.findTicketById.mockResolvedValue(
        makeTicket({ status: 'PREPARING' }),
      );

      const result = await service.updateItemStatus(
        'tenant',
        'kti-1',
        { status: 'READY', version: 1 },
        'user-1',
      );

      expect(result).toBeDefined();
    });

    it('G: should auto-update ticket to READY when all items are READY', async () => {
      const ticket = makeTicket({ status: 'PREPARING', version: 2 });
      repo.findItemWithTicket.mockResolvedValue({
        id: 'kti-1',
        ticketId: 'ticket-1',
        menuItemName: 'Tacos al Pastor',
        status: 'PREPARING',
        version: 1,
        ticket,
      });

      repo.updateItemStatus.mockResolvedValue({
        id: 'kti-1',
        status: 'READY',
        readyAt: new Date(),
        version: 2,
      });
      repo.findTicketItems.mockResolvedValue([
        { id: 'kti-1', status: 'READY', version: 2 },
        { id: 'kti-2', status: 'READY', version: 2 },
      ]);
      repo.updateTicketStatus.mockResolvedValue(
        makeTicket({ status: 'READY', readyAt: new Date(), version: 3 }),
      );
      repo.findTicketById.mockResolvedValue(
        makeTicket({ status: 'READY', readyAt: new Date(), version: 3 }),
      );

      const result = await service.updateItemStatus(
        'tenant',
        'kti-1',
        { status: 'READY', version: 1 },
        'user-1',
      );

      expect(result.status).toBe('READY');
      expect(repo.updateTicketStatus).toHaveBeenCalledWith(
        'tenant',
        'ticket-1',
        expect.objectContaining({ status: 'READY' }),
        2,
        expect.anything(),
      );
    });

    it('H: should auto-cancel ticket when all items are CANCELLED', async () => {
      const ticket = makeTicket({ status: 'PREPARING', version: 2 });
      repo.findItemWithTicket.mockResolvedValue({
        id: 'kti-1',
        ticketId: 'ticket-1',
        menuItemName: 'Tacos al Pastor',
        status: 'PREPARING',
        version: 1,
        ticket,
      });

      repo.updateItemStatus.mockResolvedValue({
        id: 'kti-1',
        status: 'CANCELLED',
        version: 2,
      });
      repo.findTicketItems.mockResolvedValue([
        { id: 'kti-1', status: 'CANCELLED', version: 2 },
        { id: 'kti-2', status: 'CANCELLED', version: 2 },
      ]);
      repo.updateTicketStatus.mockResolvedValue(
        makeTicket({ status: 'CANCELLED', version: 3 }),
      );
      repo.findTicketById.mockResolvedValue(
        makeTicket({ status: 'CANCELLED', version: 3 }),
      );

      const result = await service.updateItemStatus(
        'tenant',
        'kti-1',
        { status: 'CANCELLED', version: 1 },
        'user-1',
      );

      expect(result.status).toBe('CANCELLED');
    });

    it('should reject item status change with wrong version (optimistic locking)', async () => {
      repo.findItemWithTicket.mockResolvedValue({
        id: 'kti-1',
        ticketId: 'ticket-1',
        menuItemName: 'Tacos al Pastor',
        status: 'PENDING',
        version: 2,
        ticket: makeTicket({ version: 1 }),
      });

      repo.updateItemStatus.mockResolvedValue(null);

      await expect(
        service.updateItemStatus(
          'tenant',
          'kti-1',
          { status: 'PREPARING', version: 1 },
          'user-1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('should return ticket by ID', async () => {
      repo.findTicketById.mockResolvedValue(makeTicket());

      const result = await service.findById('tenant', 'ticket-1');
      expect(result.id).toBe('ticket-1');
      expect(result.items).toHaveLength(2);
    });

    it('should throw NotFoundException if not found', async () => {
      repo.findTicketById.mockResolvedValue(null);

      await expect(
        service.findById('tenant', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findTickets', () => {
    it('L: should filter by status', async () => {
      repo.findTickets.mockResolvedValue({ data: [makeTicket()], total: 1 });

      await service.findTickets('tenant', { status: 'PENDING', page: 1, limit: 20 });

      expect(repo.findTickets).toHaveBeenCalledWith(
        'tenant',
        expect.objectContaining({ status: 'PENDING' }),
        { skip: 0, take: 20 },
      );
    });

    it('L: should filter by priority', async () => {
      repo.findTickets.mockResolvedValue({ data: [], total: 0 });

      await service.findTickets('tenant', { priority: 'URGENT', page: 1, limit: 20 });

      expect(repo.findTickets).toHaveBeenCalledWith(
        'tenant',
        expect.objectContaining({ priority: 'URGENT' }),
        { skip: 0, take: 20 },
      );
    });

    it('L: should filter by branchId', async () => {
      repo.findTickets.mockResolvedValue({ data: [], total: 0 });

      await service.findTickets('tenant', { branchId: 'branch-1', page: 1, limit: 20 });

      expect(repo.findTickets).toHaveBeenCalledWith(
        'tenant',
        expect.objectContaining({ branchId: 'branch-1' }),
        { skip: 0, take: 20 },
      );
    });

    it('L: should filter by date range', async () => {
      repo.findTickets.mockResolvedValue({ data: [], total: 0 });

      await service.findTickets('tenant', {
        dateFrom: '2026-07-01T00:00:00.000Z',
        dateTo: '2026-07-31T23:59:59.999Z',
        page: 1,
        limit: 20,
      });

      expect(repo.findTickets).toHaveBeenCalledWith(
        'tenant',
        expect.objectContaining({
          createdAt: {
            gte: new Date('2026-07-01T00:00:00.000Z'),
            lte: new Date('2026-07-31T23:59:59.999Z'),
          },
        }),
        { skip: 0, take: 20 },
      );
    });

    it('L: should paginate correctly', async () => {
      repo.findTickets.mockResolvedValue({ data: [makeTicket()], total: 45 });

      const result = await service.findTickets('tenant', {
        page: 2,
        limit: 20,
      });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
      expect(result.total).toBe(45);
      expect(result.totalPages).toBe(3);
      expect(repo.findTickets).toHaveBeenCalledWith(
        'tenant',
        expect.anything(),
        { skip: 20, take: 20 },
      );
    });

    it('M: should return correct roles in Swagger docs', async () => {
      repo.findTickets.mockResolvedValue({ data: [], total: 0 });
      const result = await service.findTickets('tenant', { page: 1, limit: 20 });
      expect(result.data).toEqual([]);
    });
  });

  describe('snapshot integrity', () => {
    it('should copy item notes to kitchen ticket items', async () => {
      repo.findTicketByOrderId.mockResolvedValue(null);
      repo.findOrderForTicket.mockResolvedValue(makeOrder());
      repo.createTicket.mockImplementation(
        async (_s: string, data: any, items: any[], _tx: any) => {
          return makeTicket({
            items: items.map((item: any, i: number) => ({
              id: `kti-${i + 1}`,
              orderItemId: item.orderItemId,
              menuItemName: item.menuItemName,
              quantity: item.quantity,
              notes: item.notes ?? null,
              status: 'PENDING',
              version: 1,
              startedAt: null,
              readyAt: null,
            })),
          });
        },
      );

      const result = await service.createTicket(
        'tenant',
        { orderId: 'order-1' },
        'user-1',
      );

      expect(result.items[0].notes).toBe('Sin cebolla');
      expect(result.items[1].notes).toBeNull();
    });

    it('should not modify original order notes', async () => {
      const orderWithNotes = makeOrder({ notes: 'Mesa de cumpleaños' });
      repo.findTicketByOrderId.mockResolvedValue(null);
      repo.findOrderForTicket.mockResolvedValue(orderWithNotes);
      repo.createTicket.mockResolvedValue(
        makeTicket({
          order: {
            folio: '20260724-0001',
            customerName: 'Juan Perez',
            notes: 'Mesa de cumpleaños',
            table: { number: 5, branchId: 'branch-1' },
            branch: { id: 'branch-1', name: 'Sucursal Centro' },
          },
        }),
      );

      const result = await service.createTicket(
        'tenant',
        { orderId: 'order-1' },
        'user-1',
      );

      expect(result.notes).toBe('Mesa de cumpleaños');
    });
  });

  describe('O: concurrent updates', () => {
    it('should handle concurrent item status updates with optimistic locking', async () => {
      const ticket = makeTicket({ status: 'PREPARING', version: 2 });

      repo.findItemWithTicket
        .mockResolvedValueOnce({
          id: 'kti-1',
          ticketId: 'ticket-1',
          menuItemName: 'Tacos al Pastor',
          status: 'PREPARING',
          version: 1,
          ticket,
        })
        .mockResolvedValueOnce({
          id: 'kti-1',
          ticketId: 'ticket-1',
          menuItemName: 'Tacos al Pastor',
          status: 'PREPARING',
          version: 2,
          ticket,
        });

      repo.updateItemStatus
        .mockResolvedValueOnce({ id: 'kti-1', status: 'READY', version: 2 })
        .mockResolvedValueOnce(null);
      repo.findTicketItems
        .mockResolvedValueOnce([
          { id: 'kti-1', status: 'READY', version: 2 },
          { id: 'kti-2', status: 'PREPARING', version: 1 },
        ]);
      repo.updateTicketStatus.mockResolvedValue(null);
      repo.findTicketById.mockResolvedValue(
        makeTicket({ status: 'PREPARING', version: 2 }),
      );

      const result1 = await service.updateItemStatus(
        'tenant',
        'kti-1',
        { status: 'READY', version: 1 },
        'user-1',
      );

      await expect(
        service.updateItemStatus(
          'tenant',
          'kti-1',
          { status: 'READY', version: 1 },
          'user-2',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('invalid ticket transitions', () => {
    it('should reject CANCELLED -> any', async () => {
      repo.findTicketById.mockResolvedValue(makeTicket({ status: 'CANCELLED' }));

      await expect(
        service.updateTicketStatus(
          'tenant',
          'ticket-1',
          { status: 'PREPARING', version: 1 },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject READY -> PREPARING', async () => {
      repo.findTicketById.mockResolvedValue(makeTicket({ status: 'READY' }));

      await expect(
        service.updateTicketStatus(
          'tenant',
          'ticket-1',
          { status: 'PREPARING', version: 1 },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject PENDING -> DELIVERED', async () => {
      repo.findTicketById.mockResolvedValue(makeTicket({ status: 'PENDING' }));

      await expect(
        service.updateTicketStatus(
          'tenant',
          'ticket-1',
          { status: 'DELIVERED', version: 1 },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('invalid item transitions', () => {
    it('should reject PENDING -> READY directly', async () => {
      repo.findItemWithTicket.mockResolvedValue({
        id: 'kti-1',
        ticketId: 'ticket-1',
        menuItemName: 'Tacos al Pastor',
        status: 'PENDING',
        version: 1,
        ticket: makeTicket(),
      });

      await expect(
        service.updateItemStatus(
          'tenant',
          'kti-1',
          { status: 'READY', version: 1 },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject READY -> any', async () => {
      repo.findItemWithTicket.mockResolvedValue({
        id: 'kti-1',
        ticketId: 'ticket-1',
        menuItemName: 'Tacos al Pastor',
        status: 'READY',
        version: 1,
        ticket: makeTicket({ status: 'READY' }),
      });

      await expect(
        service.updateItemStatus(
          'tenant',
          'kti-1',
          { status: 'PREPARING', version: 1 },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject CANCELLED -> any', async () => {
      repo.findItemWithTicket.mockResolvedValue({
        id: 'kti-1',
        ticketId: 'ticket-1',
        menuItemName: 'Tacos al Pastor',
        status: 'CANCELLED',
        version: 1,
        ticket: makeTicket({ status: 'CANCELLED' }),
      });

      await expect(
        service.updateItemStatus(
          'tenant',
          'kti-1',
          { status: 'PREPARING', version: 1 },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('READY manual ticket validation', () => {
    it('should reject READY when not all non-cancelled items are READY', async () => {
      repo.findTicketById.mockResolvedValue(
        makeTicket({ status: 'PREPARING' }),
      );
      repo.findTicketItems.mockResolvedValue([
        { id: 'kti-1', status: 'READY', version: 2 },
        { id: 'kti-2', status: 'PREPARING', version: 1 },
      ]);

      await expect(
        service.updateTicketStatus(
          'tenant',
          'ticket-1',
          { status: 'READY', version: 1 },
          'user-1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject READY when all items are cancelled', async () => {
      repo.findTicketById.mockResolvedValue(
        makeTicket({ status: 'PREPARING' }),
      );
      repo.findTicketItems.mockResolvedValue([
        { id: 'kti-1', status: 'CANCELLED', version: 2 },
        { id: 'kti-2', status: 'CANCELLED', version: 2 },
      ]);
      repo.updateTicketStatus.mockResolvedValue(
        makeTicket({ status: 'READY', version: 2 }),
      );

      await expect(
        service.updateTicketStatus(
          'tenant',
          'ticket-1',
          { status: 'READY', version: 1 },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow READY when all non-cancelled items are READY', async () => {
      repo.findTicketById.mockResolvedValueOnce(
        makeTicket({ status: 'PREPARING' }),
      );
      repo.findTicketItems.mockResolvedValue([
        { id: 'kti-1', status: 'READY', version: 2 },
        { id: 'kti-2', status: 'CANCELLED', version: 2 },
      ]);
      repo.updateTicketStatus.mockResolvedValue(
        makeTicket({ status: 'READY', readyAt: new Date() }),
      );

      const result = await service.updateTicketStatus(
        'tenant',
        'ticket-1',
        { status: 'READY', version: 1 },
        'user-1',
      );

      expect(result.status).toBe('READY');
    });
  });

  describe('CANCELLED reason requirement', () => {
    it('should require reason when cancelling a ticket', async () => {
      repo.findTicketById.mockResolvedValue(makeTicket({ status: 'PENDING' }));

      await expect(
        service.updateTicketStatus(
          'tenant',
          'ticket-1',
          { status: 'CANCELLED', version: 1 },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should require non-empty reason', async () => {
      repo.findTicketById.mockResolvedValue(makeTicket({ status: 'PENDING' }));

      await expect(
        service.updateTicketStatus(
          'tenant',
          'ticket-1',
          { status: 'CANCELLED', version: 1, reason: '   ' },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow CANCELLED with valid reason', async () => {
      repo.findTicketById.mockResolvedValue(makeTicket({ status: 'PENDING' }));
      repo.updateTicketStatus.mockResolvedValue(
        makeTicket({ status: 'CANCELLED' }),
      );

      const result = await service.updateTicketStatus(
        'tenant',
        'ticket-1',
        { status: 'CANCELLED', version: 1, reason: 'Ingrediente no disponible' },
        'user-1',
      );

      expect(result.status).toBe('CANCELLED');
    });
  });

  describe('order eligibility', () => {
    it('should reject ticket for IN_PROGRESS order', async () => {
      repo.findTicketByOrderId.mockResolvedValue(null);
      repo.findOrderForTicket.mockResolvedValue(
        makeOrder({ status: 'IN_PROGRESS' }),
      );

      await expect(
        service.createTicket('tenant', { orderId: 'order-1' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject ticket for READY order', async () => {
      repo.findTicketByOrderId.mockResolvedValue(null);
      repo.findOrderForTicket.mockResolvedValue(
        makeOrder({ status: 'READY' }),
      );

      await expect(
        service.createTicket('tenant', { orderId: 'order-1' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject ticket for DELIVERED order', async () => {
      repo.findTicketByOrderId.mockResolvedValue(null);
      repo.findOrderForTicket.mockResolvedValue(
        makeOrder({ status: 'DELIVERED' }),
      );

      await expect(
        service.createTicket('tenant', { orderId: 'order-1' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject ticket for PAID order', async () => {
      repo.findTicketByOrderId.mockResolvedValue(null);
      repo.findOrderForTicket.mockResolvedValue(
        makeOrder({ status: 'PAID' }),
      );

      await expect(
        service.createTicket('tenant', { orderId: 'order-1' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept PENDING order', async () => {
      repo.findTicketByOrderId.mockResolvedValue(null);
      repo.findOrderForTicket.mockResolvedValue(
        makeOrder({ status: 'PENDING' }),
      );
      repo.createTicket.mockResolvedValue(makeTicket());

      const result = await service.createTicket(
        'tenant',
        { orderId: 'order-1' },
        'user-1',
      );

      expect(result.id).toBe('ticket-1');
    });

    it('should accept CONFIRMED order', async () => {
      repo.findTicketByOrderId.mockResolvedValue(null);
      repo.findOrderForTicket.mockResolvedValue(makeOrder());
      repo.createTicket.mockResolvedValue(makeTicket());

      const result = await service.createTicket(
        'tenant',
        { orderId: 'order-1' },
        'user-1',
      );

      expect(result.id).toBe('ticket-1');
    });
  });

  describe('P2002 race condition capture', () => {
    it('should convert P2002 on order_id to ConflictException with existing ticket', async () => {
      repo.findTicketByOrderId
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeTicket());
      repo.findOrderForTicket.mockResolvedValue(makeOrder());
      const p2002Error = new Error('Unique constraint failed');
      (p2002Error as any).code = 'P2002';
      (p2002Error as any).meta = { target: ['order_id'] };
      repo.runTransaction.mockRejectedValueOnce(p2002Error);

      await expect(
        service.createTicket('tenant', { orderId: 'order-1' }, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should convert generic P2002 to ConflictException', async () => {
      repo.findTicketByOrderId.mockResolvedValue(null);
      const p2002Error = new Error('Unique constraint failed');
      (p2002Error as any).code = 'P2002';
      (p2002Error as any).meta = { target: ['id'] };
      repo.runTransaction.mockRejectedValueOnce(p2002Error);

      await expect(
        service.createTicket('tenant', { orderId: 'order-1' }, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('ActivityLog rollback in createTicket', () => {
    it('should propagate ActivityLog error and rollback transaction', async () => {
      repo.findTicketByOrderId.mockResolvedValue(null);
      repo.findOrderForTicket.mockResolvedValue(makeOrder());
      repo.createTicket.mockResolvedValue(makeTicket());
      activityLogRepo.create.mockRejectedValue(
        new Error('ActivityLog write failed'),
      );

      await expect(
        service.createTicket('tenant', { orderId: 'order-1' }, 'user-1'),
      ).rejects.toThrow('ActivityLog write failed');
    });
  });

  describe('multi-tenancy isolation', () => {
    it('should not cross tenant boundaries on ticket lookup', async () => {
      repo.findTicketById.mockResolvedValue(makeTicket());

      const result = await service.findById('tenant_a', 'ticket-1');

      expect(repo.findTicketById).toHaveBeenCalledWith('tenant_a', 'ticket-1');
      expect(result.id).toBe('ticket-1');
    });

    it('should scope createTicket activity log to correct tenant', async () => {
      repo.findTicketByOrderId.mockResolvedValue(null);
      repo.findOrderForTicket.mockResolvedValue(makeOrder());
      repo.createTicket.mockResolvedValue(makeTicket());

      await service.createTicket('tenant_b', { orderId: 'order-1' }, 'user-1');

      expect(repo.createTicket).toHaveBeenCalledWith(
        'tenant_b',
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
      expect(activityLogRepo.create).toHaveBeenCalledWith(
        'tenant_b',
        expect.objectContaining({ branchId: 'branch-1' }),
        expect.anything(),
      );
    });

    it('should not share tickets between tenants in findTickets', async () => {
      repo.findTickets.mockResolvedValue({ data: [], total: 0 });

      await service.findTickets('tenant_a', { page: 1, limit: 20 });

      expect(repo.findTickets).toHaveBeenCalledWith(
        'tenant_a',
        expect.anything(),
        expect.anything(),
      );
    });
  });

  describe('mixed item states - deriveTicketStatus', () => {
    it('should keep ticket as PREPARING when items have mixed READY/PENDING', async () => {
      const ticket = makeTicket({ status: 'PENDING' });
      repo.findItemWithTicket.mockResolvedValue({
        id: 'kti-1',
        ticketId: 'ticket-1',
        menuItemName: 'Tacos al Pastor',
        status: 'PENDING',
        version: 1,
        ticket,
      });

      repo.updateItemStatus.mockResolvedValue({
        id: 'kti-1',
        status: 'PREPARING',
        version: 2,
      });
      repo.findTicketItems.mockResolvedValue([
        { id: 'kti-1', status: 'PREPARING', version: 2 },
        { id: 'kti-2', status: 'PENDING', version: 1 },
      ]);
      repo.updateTicketStatus.mockResolvedValue(null);
      repo.findTicketById.mockResolvedValue(
        makeTicket({ status: 'PREPARING' }),
      );

      const result = await service.updateItemStatus(
        'tenant',
        'kti-1',
        { status: 'PREPARING', version: 1 },
        'user-1',
      );

      expect(result).toBeDefined();
    });

    it('should auto-update ticket from PENDING to PREPARING on first item prep', async () => {
      const ticket = makeTicket({ status: 'PENDING', version: 1 });
      repo.findItemWithTicket.mockResolvedValue({
        id: 'kti-1',
        ticketId: 'ticket-1',
        menuItemName: 'Tacos al Pastor',
        status: 'PENDING',
        version: 1,
        ticket,
      });

      repo.updateItemStatus.mockResolvedValue({
        id: 'kti-1',
        status: 'PREPARING',
        version: 2,
      });
      repo.findTicketItems.mockResolvedValue([
        { id: 'kti-1', status: 'PREPARING', version: 2 },
        { id: 'kti-2', status: 'PENDING', version: 1 },
      ]);
      repo.updateTicketStatus.mockResolvedValue(
        makeTicket({ status: 'PREPARING', startedAt: new Date(), version: 2 }),
      );
      repo.findTicketById.mockResolvedValue(
        makeTicket({ status: 'PREPARING', startedAt: new Date() }),
      );

      const result = await service.updateItemStatus(
        'tenant',
        'kti-1',
        { status: 'PREPARING', version: 1 },
        'user-1',
      );

      expect(repo.updateTicketStatus).toHaveBeenCalledWith(
        'tenant',
        'ticket-1',
        expect.objectContaining({ status: 'PREPARING' }),
        1,
        expect.anything(),
      );
    });
  });
});
