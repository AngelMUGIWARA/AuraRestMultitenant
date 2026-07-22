jest.mock('../generated/prisma-tenant', () => ({
  PrismaClient: jest.fn(() => ({})),
}));

jest.mock('../generated/prisma-system', () => ({
  PrismaClient: jest.fn(() => ({})),
}));

import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { TenantPrismaService } from '../database/tenant-prisma.service';

const SCHEMA = 'tenant_test';

function mockDb() {
  const user = {
    findUnique: jest.fn(),
    update: jest.fn(),
  };
  return { user, $disconnect: jest.fn() };
}

function mockPrisma() {
  return {
    tenant: {
      findUnique: jest.fn().mockResolvedValue({
        slug: 'test-slug',
        schemaName: SCHEMA,
      }),
    },
  };
}

function mockJwt(): JwtService {
  return {
    sign: jest.fn().mockReturnValue('mock-token'),
    verify: jest.fn(),
  } as unknown as JwtService;
}

function buildService() {
  const tenantPrisma = {
    getClient: jest.fn(),
  } as unknown as TenantPrismaService;
  const prisma = mockPrisma() as unknown as PrismaService;
  const jwt = mockJwt();

  const svc = new AuthService(prisma, tenantPrisma, jwt);
  return { svc, tenantPrisma, prisma, jwt };
}

describe('AuthService', () => {
  describe('login convencional exitoso', () => {
    it('debe retornar accessToken y refreshToken con credenciales válidas', async () => {
      const { svc, tenantPrisma } = buildService();
      const db = mockDb();
      (tenantPrisma.getClient as jest.Mock).mockReturnValue(db);

      db.user.findUnique.mockResolvedValue({
        id: 'u1',
        name: 'Test',
        email: 'test@test.com',
        passwordHash: '$2b$10$gyexhOEEEx3Jq6NyRxD3uePE4MfyHCDFIPoBojEjoScAffoRpgni.',
        role: 'OWNER',
        status: 'ACTIVE',
      });

      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
      process.env.JWT_REFRESH_EXPIRES_IN = '7d';

      const result = await svc.login(
        { email: 'test@test.com', password: 'TestPass123' },
        SCHEMA,
      );

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('test@test.com');
    });
  });

  describe('login convencional inválido', () => {
    it('debe lanzar 401 si el usuario no existe', async () => {
      const { svc, tenantPrisma } = buildService();
      const db = mockDb();
      (tenantPrisma.getClient as jest.Mock).mockReturnValue(db);
      db.user.findUnique.mockResolvedValue(null);

      await expect(
        svc.login({ email: 'no@existe.com', password: 'pass' }, SCHEMA),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar 401 si la contraseña es incorrecta', async () => {
      const { svc, tenantPrisma } = buildService();
      const db = mockDb();
      (tenantPrisma.getClient as jest.Mock).mockReturnValue(db);

      db.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'test@test.com',
        passwordHash: '$2b$10$gyexhOEEEx3Jq6NyRxD3uePE4MfyHCDFIPoBojEjoScAffoRpgni.',
        role: 'OWNER',
        status: 'ACTIVE',
      });

      await expect(
        svc.login({ email: 'test@test.com', password: 'wrong' }, SCHEMA),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar 401 si el usuario está inactivo', async () => {
      const { svc, tenantPrisma } = buildService();
      const db = mockDb();
      (tenantPrisma.getClient as jest.Mock).mockReturnValue(db);

      db.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'test@test.com',
        passwordHash: '$2b$10$gyexhOEEEx3Jq6NyRxD3uePE4MfyHCDFIPoBojEjoScAffoRpgni.',
        role: 'OWNER',
        status: 'INACTIVE',
      });

      await expect(
        svc.login({ email: 'test@test.com', password: 'TestPass123' }, SCHEMA),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh token', () => {
    it('debe retornar nuevos tokens con refresh token válido', async () => {
      const { svc, tenantPrisma, jwt } = buildService();
      const db = mockDb();
      (tenantPrisma.getClient as jest.Mock).mockReturnValue(db);

      (jwt.verify as jest.Mock).mockReturnValue({
        sub: 'u1',
        email: 'test@test.com',
        role: 'OWNER',
        tenantSchemaName: SCHEMA,
      });

      db.user.findUnique.mockResolvedValue({
        id: 'u1',
        name: 'Test',
        email: 'test@test.com',
        role: 'OWNER',
        status: 'ACTIVE',
      });

      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
      process.env.JWT_REFRESH_EXPIRES_IN = '7d';

      const result = await svc.refreshToken('valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('debe lanzar 401 con refresh token inválido', async () => {
      const { svc, jwt } = buildService();
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(svc.refreshToken('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('configuración de voice seed', () => {
    it('debe configurar voiceUsername y voiceSeedHash correctamente', async () => {
      const { svc, tenantPrisma } = buildService();
      const db = mockDb();
      (tenantPrisma.getClient as jest.Mock).mockReturnValue(db);

      db.user.findUnique.mockResolvedValue(null);
      db.user.update.mockResolvedValue({});

      const result = await svc.setVoiceSeed('u1', SCHEMA, {
        voiceUsername: 'miusuario',
        seedWord: 'manzana azul siete',
      });

      expect(result.voiceUsername).toBe('miusuario');
      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: {
          voiceUsername: 'miusuario',
          voiceSeedHash: expect.any(String),
        },
      });
    });

    it('debe lanzar 409 si voiceUsername ya está en uso por otro usuario', async () => {
      const { svc, tenantPrisma } = buildService();
      const db = mockDb();
      (tenantPrisma.getClient as jest.Mock).mockReturnValue(db);

      db.user.findUnique.mockResolvedValue({
        id: 'u-other',
        voiceUsername: 'miusuario',
      });

      await expect(
        svc.setVoiceSeed('u1', SCHEMA, {
          voiceUsername: 'miusuario',
          seedWord: 'manzana azul',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('debe permitir reasignar el mismo voiceUsername al mismo usuario', async () => {
      const { svc, tenantPrisma } = buildService();
      const db = mockDb();
      (tenantPrisma.getClient as jest.Mock).mockReturnValue(db);

      db.user.findUnique.mockResolvedValue({
        id: 'u1',
        voiceUsername: 'miusuario',
      });
      db.user.update.mockResolvedValue({});

      const result = await svc.setVoiceSeed('u1', SCHEMA, {
        voiceUsername: 'miusuario',
        seedWord: 'nueva semilla',
      });

      expect(result.voiceUsername).toBe('miusuario');
    });
  });

  describe('voice login exitoso', () => {
    it('debe retornar valid: true con datos del usuario', async () => {
      const { svc, tenantPrisma } = buildService();
      const db = mockDb();
      (tenantPrisma.getClient as jest.Mock).mockReturnValue(db);

      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('manzana azul siete', 10);

      db.user.findUnique.mockResolvedValue({
        id: 'u1',
        name: 'Ana',
        role: 'OWNER',
        status: 'ACTIVE',
        voiceSeedHash: hash,
      });

      const result = await svc.voiceLogin(
        { voiceUsername: 'ana', seedWord: 'manzana azul siete' },
        SCHEMA,
      );

      expect(result.valid).toBe(true);
      expect(result.name).toBe('Ana');
      expect(result.role).toBe('OWNER');
    });
  });

  describe('voice login con usuario inexistente', () => {
    it('debe retornar valid: false sin revelar existencia', async () => {
      const { svc, tenantPrisma } = buildService();
      const db = mockDb();
      (tenantPrisma.getClient as jest.Mock).mockReturnValue(db);

      db.user.findUnique.mockResolvedValue(null);

      const result = await svc.voiceLogin(
        { voiceUsername: 'noexiste', seedWord: 'algo' },
        SCHEMA,
      );

      expect(result.valid).toBe(false);
    });
  });

  describe('voice login con seed inválido', () => {
    it('debe retornar valid: false si la semilla no coincide', async () => {
      const { svc, tenantPrisma } = buildService();
      const db = mockDb();
      (tenantPrisma.getClient as jest.Mock).mockReturnValue(db);

      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('correcta', 10);

      db.user.findUnique.mockResolvedValue({
        id: 'u1',
        name: 'Ana',
        role: 'OWNER',
        status: 'ACTIVE',
        voiceSeedHash: hash,
      });

      const result = await svc.voiceLogin(
        { voiceUsername: 'ana', seedWord: 'incorrecta' },
        SCHEMA,
      );

      expect(result.valid).toBe(false);
    });
  });

  describe('usuario sin credenciales de voz', () => {
    it('debe retornar valid: false si voiceSeedHash es null', async () => {
      const { svc, tenantPrisma } = buildService();
      const db = mockDb();
      (tenantPrisma.getClient as jest.Mock).mockReturnValue(db);

      db.user.findUnique.mockResolvedValue({
        id: 'u1',
        name: 'Ana',
        role: 'OWNER',
        status: 'ACTIVE',
        voiceSeedHash: null,
      });

      const result = await svc.voiceLogin(
        { voiceUsername: 'ana', seedWord: 'algo' },
        SCHEMA,
      );

      expect(result.valid).toBe(false);
    });

    it('debe retornar valid: false si el usuario tiene un rol no permitido', async () => {
      const { svc, tenantPrisma } = buildService();
      const db = mockDb();
      (tenantPrisma.getClient as jest.Mock).mockReturnValue(db);

      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('semilla', 10);

      db.user.findUnique.mockResolvedValue({
        id: 'u1',
        name: 'Pedro',
        role: 'WAITER',
        status: 'ACTIVE',
        voiceSeedHash: hash,
      });

      const result = await svc.voiceLogin(
        { voiceUsername: 'pedro', seedWord: 'semilla' },
        SCHEMA,
      );

      expect(result.valid).toBe(false);
    });
  });
});
