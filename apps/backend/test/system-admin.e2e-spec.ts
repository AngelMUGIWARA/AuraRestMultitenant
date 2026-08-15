const request = require('supertest');
import { INestApplication, JwtService } from '@nestjs/common';
import {
  createIntegrationTestApp,
  generateAccessToken,
  generateSystemAdminAccessToken,
  generateSystemAdminRefreshToken,
} from './helpers/test-app.helper';
import {
  ACTIVE_PASSWORD,
  getActivePasswordHash,
  mockSuperAdmin,
  mockInactiveSuperAdmin,
  mockOwnerUser,
} from './helpers/test-data';

describe('System Admin (Integration HTTP)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let mockPrisma: any;

  beforeAll(async () => {
    mockSuperAdmin.passwordHash = await getActivePasswordHash();
    mockInactiveSuperAdmin.passwordHash = await getActivePasswordHash();

    const result = await createIntegrationTestApp();
    app = result.app;
    jwtService = result.jwtService;
    mockPrisma = result.mockPrisma;
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.superAdmin.findUnique = jest.fn();
    mockPrisma.tenant.findMany = jest.fn().mockResolvedValue([]);
    mockPrisma.tenant.findUnique = jest.fn();
    mockPrisma.tenant.update = jest.fn();
    mockPrisma.systemAuditLog.create = jest.fn().mockResolvedValue(undefined);
    mockPrisma.systemAuditLog.findMany = jest.fn().mockResolvedValue([]);
  });

  // ── SA-01: login ─────────────────────────────────────────────
  describe('POST /api/v1/system-admin/auth/login', () => {
    it('debe retornar 200 con accessToken/refreshToken/superAdmin con credenciales válidas', async () => {
      mockPrisma.superAdmin.findUnique.mockResolvedValue(mockSuperAdmin);

      const res = await request(app.getHttpServer())
        .post('/api/v1/system-admin/auth/login')
        .send({ email: mockSuperAdmin.email, password: ACTIVE_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.superAdmin.email).toBe(mockSuperAdmin.email);
      expect(res.body.superAdmin.role).toBe('SUPER_ADMIN');
    });

    it('debe retornar 401 con contraseña incorrecta', async () => {
      mockPrisma.superAdmin.findUnique.mockResolvedValue(mockSuperAdmin);

      const res = await request(app.getHttpServer())
        .post('/api/v1/system-admin/auth/login')
        .send({ email: mockSuperAdmin.email, password: 'wrongpassword' });

      expect(res.status).toBe(401);
    });

    it('debe retornar 401 con email inexistente', async () => {
      mockPrisma.superAdmin.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/api/v1/system-admin/auth/login')
        .send({ email: 'nadie@aurarest.dev', password: ACTIVE_PASSWORD });

      expect(res.status).toBe(401);
    });

    it('debe retornar 401 con Super Admin inactivo', async () => {
      mockPrisma.superAdmin.findUnique.mockResolvedValue(mockInactiveSuperAdmin);

      const res = await request(app.getHttpServer())
        .post('/api/v1/system-admin/auth/login')
        .send({ email: mockInactiveSuperAdmin.email, password: ACTIVE_PASSWORD });

      expect(res.status).toBe(401);
    });
  });

  // ── refresh ──────────────────────────────────────────────────
  describe('POST /api/v1/system-admin/auth/refresh', () => {
    it('debe retornar 200 con nuevos tokens con refresh token válido', async () => {
      mockPrisma.superAdmin.findUnique.mockResolvedValue(mockSuperAdmin);

      const refreshToken = generateSystemAdminRefreshToken(jwtService, mockSuperAdmin);

      const res = await request(app.getHttpServer())
        .post('/api/v1/system-admin/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
    });

    it('debe retornar 401 con refresh token inválido', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/system-admin/auth/refresh')
        .send({ refreshToken: 'not-a-real-token' });

      expect(res.status).toBe(401);
    });
  });

  // ── SA-02: listar tenants ────────────────────────────────────
  describe('GET /api/v1/system-admin/tenants', () => {
    it('debe retornar 200 con un token de Super Admin válido', async () => {
      const token = generateSystemAdminAccessToken(jwtService, mockSuperAdmin);

      const res = await request(app.getHttpServer())
        .get('/api/v1/system-admin/tenants')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('debe retornar 401 sin token', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/system-admin/tenants');
      expect(res.status).toBe(401);
    });
  });

  // ── SA-03: suspender/activar tenant ──────────────────────────
  describe('PATCH /api/v1/system-admin/tenants/:id/suspend', () => {
    it('debe suspender el tenant y registrar el evento en el audit log', async () => {
      const token = generateSystemAdminAccessToken(jwtService, mockSuperAdmin);
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-001', status: 'ACTIVE' });
      mockPrisma.tenant.update.mockResolvedValue({ id: 'tenant-001', status: 'SUSPENDED' });

      const res = await request(app.getHttpServer())
        .patch('/api/v1/system-admin/tenants/tenant-001/suspend')
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'Pago vencido' });

      expect(res.status).toBe(200);
      expect(mockPrisma.systemAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'TENANT_SUSPENDED', targetId: 'tenant-001' }),
        }),
      );
    });
  });

  // ── SA-04: audit log ─────────────────────────────────────────
  describe('GET /api/v1/system-admin/audit-logs', () => {
    it('debe retornar 200 con un token de Super Admin válido', async () => {
      const token = generateSystemAdminAccessToken(jwtService, mockSuperAdmin);

      const res = await request(app.getHttpServer())
        .get('/api/v1/system-admin/audit-logs')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });

  // ── SA-05: aislamiento entre Super Admin y tenants ───────────
  // Nota: solo se prueba esta dirección (JWT de tenant -> rutas de
  // system-admin) porque SystemJwtAuthGuard se aplica explícitamente vía
  // @UseGuards() en el controller, así que corre sin importar cómo esté
  // armado el harness de pruebas. La dirección inversa dependería de que
  // este arnés de test instale JwtAuthGuard/RolesGuard como APP_GUARD
  // globales para las rutas de tenant — cosa que createIntegrationTestApp()
  // no hace (solo registra FakeThrottlerGuard), así que no sería una
  // prueba confiable del aislamiento real de la app.
  describe('Aislamiento Super Admin ↔ tenant', () => {
    it('un JWT de tenant (OWNER) debe recibir 401 al llamar rutas de system-admin', async () => {
      const tenantToken = generateAccessToken(jwtService, {
        id: mockOwnerUser.id,
        email: mockOwnerUser.email,
        role: mockOwnerUser.role,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/system-admin/tenants')
        .set('Authorization', `Bearer ${tenantToken}`);

      expect(res.status).toBe(401);
    });
  });
});
