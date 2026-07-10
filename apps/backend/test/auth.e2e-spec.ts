const request = require('supertest');
import { INestApplication, JwtService } from '@nestjs/common';
import {
  createIntegrationTestApp,
  generateAccessToken,
  generateRefreshToken,
} from './helpers/test-app.helper';
import {
  ACTIVE_PASSWORD,
  ACTIVE_PASSWORD_HASH,
  getActivePasswordHash,
  mockOwnerUser,
  mockInactiveUser,
  TENANT_SLUG,
} from './helpers/test-data';

describe('Auth (Integration HTTP)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let tenantDb: Record<string, any>;

  beforeAll(async () => {
    // Ensure a valid bcrypt hash for test password
    mockOwnerUser.passwordHash = await getActivePasswordHash();
    mockInactiveUser.passwordHash = await getActivePasswordHash();

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
    tenantDb.user = {
      findUnique: jest.fn(),
    };
    tenantDb.activityLog = { create: jest.fn() };
  });

  describe('POST /api/v1/auth/login', () => {
    it('debe retornar 200 con accessToken, refreshToken y user con credenciales válidas', async () => {
      tenantDb.user.findUnique.mockResolvedValue(mockOwnerUser);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-tenant-slug', TENANT_SLUG)
        .send({ email: mockOwnerUser.email, password: ACTIVE_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(mockOwnerUser.email);
    });

    it('debe retornar 401 con contraseña incorrecta', async () => {
      tenantDb.user.findUnique.mockResolvedValue(mockOwnerUser);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-tenant-slug', TENANT_SLUG)
        .send({ email: mockOwnerUser.email, password: 'wrongpassword' });

      expect(res.status).toBe(401);
    });

    it('debe retornar 401 con email inexistente', async () => {
      tenantDb.user.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-tenant-slug', TENANT_SLUG)
        .send({ email: 'nonexistent@test.com', password: ACTIVE_PASSWORD });

      expect(res.status).toBe(401);
    });

    it('debe retornar 401 con usuario inactivo', async () => {
      tenantDb.user.findUnique.mockResolvedValue(mockInactiveUser);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-tenant-slug', TENANT_SLUG)
        .send({ email: mockInactiveUser.email, password: ACTIVE_PASSWORD });

      expect(res.status).toBe(401);
    });

    it('debe retornar 401 sin header x-tenant-slug', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@test.com', password: ACTIVE_PASSWORD });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('debe retornar 200 con nuevos tokens con refresh token válido', async () => {
      tenantDb.user.findUnique.mockResolvedValue(mockOwnerUser);

      const refreshToken = generateRefreshToken(jwtService, {
        id: mockOwnerUser.id,
        email: mockOwnerUser.email,
        role: mockOwnerUser.role,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body).toHaveProperty('user');
    });

    it('debe retornar 401 con refresh token inválido', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token-string' });

      expect(res.status).toBe(401);
    });

    it('debe retornar 401 para refresh de usuario inactivo', async () => {
      tenantDb.user.findUnique.mockResolvedValue(mockInactiveUser);

      const refreshToken = generateRefreshToken(jwtService, {
        id: mockInactiveUser.id,
        email: mockInactiveUser.email,
        role: mockInactiveUser.role,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('debe retornar 200 con mensaje de confirmación sin body', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send();

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
    });
  });
});
