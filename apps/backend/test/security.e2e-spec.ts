const request = require('supertest');
import { INestApplication, JwtService } from '@nestjs/common';
import {
  createIntegrationTestApp,
  generateAccessToken,
} from './helpers/test-app.helper';
import {
  mockAdminUser,
  mockCreatedOrder,
  mockWaiterUser,
  TENANT_SCHEMA,
} from './helpers/test-data';

describe('Security (Integration HTTP)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let tenantDb: Record<string, any>;
  let mockTenantPrisma: any;

  beforeAll(async () => {
    const result = await createIntegrationTestApp();
    app = result.app;
    jwtService = result.jwtService;
    tenantDb = result.tenantDb;
    mockTenantPrisma = result.mockTenantPrisma;
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    tenantDb.user = { findUnique: jest.fn() };
    tenantDb.order = { findMany: jest.fn(), count: jest.fn() };
  });

  describe('Autenticación', () => {
    it('debe retornar 401 en endpoint protegido sin token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/orders');

      expect(res.status).toBe(401);
    });

    it('debe retornar 401 en endpoint protegido con token inválido', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/orders')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.status).toBe(401);
    });
  });

  describe('Roles', () => {
    it('debe retornar 403 cuando el rol no tiene permisos (WAITER en lista de órdenes)', async () => {
      const token = generateAccessToken(jwtService, {
        id: mockWaiterUser.id,
        email: mockWaiterUser.email,
        role: mockWaiterUser.role,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('debe permitir acceso con rol correcto (ADMIN en lista de órdenes)', async () => {
      tenantDb.order.findMany.mockResolvedValue([mockCreatedOrder]);
      tenantDb.order.count.mockResolvedValue(1);

      const token = generateAccessToken(jwtService, {
        id: mockAdminUser.id,
        email: mockAdminUser.email,
        role: mockAdminUser.role,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Tenant context', () => {
    it('debe usar el schemaName del tenant resuelto', async () => {
      const token = generateAccessToken(jwtService, {
        id: mockAdminUser.id,
        email: mockAdminUser.email,
        role: mockAdminUser.role,
      });

      await request(app.getHttpServer())
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`);

      expect(mockTenantPrisma.getClient).toHaveBeenCalledWith(TENANT_SCHEMA);
    });
  });

  describe('Público', () => {
    it('debe permitir acceso a endpoint @Public() sin autenticación', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
    });
  });
});
