const request = require('supertest');
import { INestApplication, JwtService } from '@nestjs/common';
import {
  createIntegrationTestApp,
  generateAccessToken,
} from './helpers/test-app.helper';
import {
  mockAdminUser,
  mockChefUser,
  mockKitchenTicket,
  mockInProgressTicket,
  TICKET_ID,
  BRANCH_ID,
} from './helpers/test-data';

describe('Kitchen (Integration HTTP)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let tenantDb: Record<string, any>;

  beforeAll(async () => {
    const result = await createIntegrationTestApp();
    app = result.app;
    jwtService = result.jwtService;
    tenantDb = result.tenantDb;
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    tenantDb.user = { findUnique: jest.fn() };
    tenantDb.kitchenTicket = {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    };
    tenantDb.order = { update: jest.fn() };
    tenantDb.activityLog = { create: jest.fn() };
  });

  function getChefToken() {
    return generateAccessToken(jwtService, {
      id: mockChefUser.id,
      email: mockChefUser.email,
      role: mockChefUser.role,
    });
  }

  describe('GET /api/v1/kitchen/queue', () => {
    it('debe retornar 200 con la cola de cocina', async () => {
      tenantDb.kitchenTicket.findMany.mockResolvedValue([mockKitchenTicket]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/kitchen/queue')
        .set('Authorization', `Bearer ${getChefToken()}`);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('debe filtrar por branchId cuando se proporciona', async () => {
      tenantDb.kitchenTicket.findMany.mockResolvedValue([mockKitchenTicket]);

      await request(app.getHttpServer())
        .get(`/api/v1/kitchen/queue?branchId=${BRANCH_ID}`)
        .set('Authorization', `Bearer ${getChefToken()}`);

      expect(tenantDb.kitchenTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            order: { table: { branchId: BRANCH_ID } },
          }),
        }),
      );
    });
  });

  describe('PATCH /api/v1/kitchen/tickets/:id/status', () => {
    it('debe permitir transición válida PENDING -> IN_PROGRESS', async () => {
      tenantDb.kitchenTicket.findUnique.mockResolvedValue(mockKitchenTicket);
      tenantDb.kitchenTicket.update.mockResolvedValue(mockInProgressTicket);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/kitchen/tickets/${TICKET_ID}/status`)
        .set('Authorization', `Bearer ${getChefToken()}`)
        .send({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(200);
    });

    it('debe rechazar transición inválida PENDING -> READY', async () => {
      tenantDb.kitchenTicket.findUnique.mockResolvedValue(mockKitchenTicket);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/kitchen/tickets/${TICKET_ID}/status`)
        .set('Authorization', `Bearer ${getChefToken()}`)
        .send({ status: 'READY' });

      expect(res.status).toBe(400);
    });

    it('debe retornar 404 si el ticket no existe', async () => {
      tenantDb.kitchenTicket.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .patch('/api/v1/kitchen/tickets/nonexistent-id/status')
        .set('Authorization', `Bearer ${getChefToken()}`)
        .send({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(404);
    });
  });
});
