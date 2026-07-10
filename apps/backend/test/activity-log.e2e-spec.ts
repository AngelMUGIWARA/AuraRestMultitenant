const request = require('supertest');
import { INestApplication, JwtService } from '@nestjs/common';
import {
  createIntegrationTestApp,
  generateAccessToken,
} from './helpers/test-app.helper';
import {
  mockAdminUser,
  mockWaiterUser,
  mockActivityLogEntry,
} from './helpers/test-data';

describe('Activity Log (Integration HTTP)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let tenantDb: Record<string, any>;
  let mockActivityLogRepo: any;

  beforeAll(async () => {
    const result = await createIntegrationTestApp();
    app = result.app;
    jwtService = result.jwtService;
    tenantDb = result.tenantDb;
    mockActivityLogRepo = result.mockActivityLogRepo;
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    tenantDb.user = { findUnique: jest.fn() };
  });

  function getAdminToken() {
    return generateAccessToken(jwtService, {
      id: mockAdminUser.id,
      email: mockAdminUser.email,
      role: mockAdminUser.role,
    });
  }

  function getWaiterToken() {
    return generateAccessToken(jwtService, {
      id: mockWaiterUser.id,
      email: mockWaiterUser.email,
      role: mockWaiterUser.role,
    });
  }

  describe('GET /api/v1/admin/activity-logs', () => {
    it('debe retornar 200 con logs paginados para ADMIN', async () => {
      mockActivityLogRepo.findMany.mockResolvedValue([mockActivityLogEntry]);
      mockActivityLogRepo.count.mockResolvedValue(1);

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/activity-logs')
        .set('Authorization', `Bearer ${getAdminToken()}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page');
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('debe retornar 403 para WAITER (rol no permitido)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/activity-logs')
        .set('Authorization', `Bearer ${getWaiterToken()}`);

      expect(res.status).toBe(403);
    });

    it('debe permitir filtrar por entity', async () => {
      mockActivityLogRepo.findMany.mockResolvedValue([mockActivityLogEntry]);
      mockActivityLogRepo.count.mockResolvedValue(1);

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/activity-logs?entity=ORDER')
        .set('Authorization', `Bearer ${getAdminToken()}`);

      expect(res.status).toBe(200);
    });
  });
});
