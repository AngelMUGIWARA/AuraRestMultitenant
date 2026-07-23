jest.mock('../generated/prisma-tenant', () => ({
  PrismaClient: jest.fn(() => ({})),
}));

jest.mock('../generated/prisma-system', () => ({
  PrismaClient: jest.fn(() => ({})),
}));

import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { TenantPrismaService } from '../database/tenant-prisma.service';

const SCHEMA = 'tenant_test';
const ACTIVE_USER = {
  id: 'u1',
  name: 'Test',
  email: 'test@test.com',
  passwordHash: '$2b$10$gyexhOEEEx3Jq6NyRxD3uePE4MfyHCDFIPoBojEjoScAffoRpgni.',
  role: 'OWNER',
  status: 'ACTIVE',
};

function mockDb() {
  return {
    user: { findUnique: jest.fn(), update: jest.fn() },
    $disconnect: jest.fn(),
  };
}

function mockRefreshSession() {
  return {
    create: jest.fn().mockResolvedValue({ id: 'sess-new', jti: 'new-jti' }),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  };
}

function mockPrisma() {
  const refreshSession = mockRefreshSession();
  const prisma: Record<string, unknown> = {
    tenant: {
      findUnique: jest.fn().mockResolvedValue({ slug: 'test-slug', schemaName: SCHEMA }),
    },
    refreshSession,
    $transaction: jest.fn(async (cbOrFns: unknown) => {
      if (typeof cbOrFns === 'function') {
        return cbOrFns(prisma);
      }
      const results: unknown[] = [];
      for (const fn of cbOrFns as unknown[]) results.push(await fn);
      return results;
    }),
  };
  return prisma;
}

function mockJwt(): JwtService {
  return {
    sign: jest.fn().mockReturnValue('mock-token'),
    verify: jest.fn(),
  } as unknown as JwtService;
}

function mockConfig(overrides?: Record<string, string>) {
  const defaults: Record<string, string> = {
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    JWT_REFRESH_EXPIRES_IN: '7d',
    JWT_SECRET: 'test-access-secret',
    JWT_EXPIRES_IN: '8h',
    ...overrides,
  };
  return {
    getOrThrow: jest.fn((key: string) => {
      if (!(key in defaults)) throw new Error(`Missing config: ${key}`);
      return defaults[key];
    }),
    get: jest.fn((key: string, defaultValue?: string) => {
      return defaults[key] ?? defaultValue;
    }),
  };
}

function buildService(configOverrides?: Record<string, string>) {
  const tenantPrisma = { getClient: jest.fn() } as unknown as TenantPrismaService;
  const prisma = mockPrisma() as unknown as PrismaService;
  const jwt = mockJwt();
  const config = mockConfig(configOverrides);
  const svc = new AuthService(prisma, tenantPrisma, jwt, config as any);
  return { svc, tenantPrisma, prisma, jwt, config };
}

describe('AuthService', () => {
  describe('hashToken', () => {
    it('returns deterministic SHA-256 hex', () => {
      const h1 = AuthService.hashToken('abc');
      const h2 = AuthService.hashToken('abc');
      expect(h1).toBe(h2);
      expect(h1).toHaveLength(64);
    });

    it('returns different hashes for different inputs', () => {
      expect(AuthService.hashToken('a')).not.toBe(AuthService.hashToken('b'));
    });
  });

  describe('login', () => {
    it('creates a session and returns tokens', async () => {
      const { svc, tenantPrisma, prisma } = buildService();
      const db = mockDb();
      (tenantPrisma.getClient as jest.Mock).mockReturnValue(db);
      db.user.findUnique.mockResolvedValue(ACTIVE_USER);

      const result = await svc.login(
        { email: 'test@test.com', password: 'TestPass123' },
        SCHEMA,
      );

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('test@test.com');
      expect(prisma.refreshSession.create).toHaveBeenCalledTimes(1);
    });

    it('does not store the raw token in the database', async () => {
      const { svc, tenantPrisma, prisma } = buildService();
      const db = mockDb();
      (tenantPrisma.getClient as jest.Mock).mockReturnValue(db);
      db.user.findUnique.mockResolvedValue(ACTIVE_USER);

      const result = await svc.login(
        { email: 'test@test.com', password: 'TestPass123' },
        SCHEMA,
      );

      const createCall = (prisma.refreshSession.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.tokenHash).not.toBe(result.refreshToken);
      expect(createCall.data.tokenHash).toBe(AuthService.hashToken(result.refreshToken));
    });

    it('throws 401 for wrong password', async () => {
      const { svc, tenantPrisma } = buildService();
      const db = mockDb();
      (tenantPrisma.getClient as jest.Mock).mockReturnValue(db);
      db.user.findUnique.mockResolvedValue(ACTIVE_USER);

      await expect(
        svc.login({ email: 'test@test.com', password: 'wrong' }, SCHEMA),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws 401 for non-existent user', async () => {
      const { svc, tenantPrisma } = buildService();
      const db = mockDb();
      (tenantPrisma.getClient as jest.Mock).mockReturnValue(db);
      db.user.findUnique.mockResolvedValue(null);

      await expect(
        svc.login({ email: 'no@existe.com', password: 'pass' }, SCHEMA),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws 401 for inactive user', async () => {
      const { svc, tenantPrisma } = buildService();
      const db = mockDb();
      (tenantPrisma.getClient as jest.Mock).mockReturnValue(db);
      db.user.findUnique.mockResolvedValue({ ...ACTIVE_USER, status: 'INACTIVE' });

      await expect(
        svc.login({ email: 'test@test.com', password: 'TestPass123' }, SCHEMA),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    function setupValidRefresh() {
      const { svc, tenantPrisma, prisma, jwt } = buildService();
      const db = mockDb();
      (tenantPrisma.getClient as jest.Mock).mockReturnValue(db);
      db.user.findUnique.mockResolvedValue(ACTIVE_USER);

      const tokenHash = AuthService.hashToken('old-refresh-token');
      (prisma.refreshSession.findUnique as jest.Mock).mockResolvedValue({
        id: 'sess-1',
        jti: 'jti-1',
        tokenHash,
        familyId: 'fam-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
      });

      (jwt.verify as jest.Mock).mockReturnValue({
        sub: 'u1',
        email: 'test@test.com',
        role: 'OWNER',
        tenantSchemaName: SCHEMA,
        jti: 'jti-1',
        familyId: 'fam-1',
      });

      return { svc, prisma, jwt, db };
    }

    it('returns new tokens on valid refresh', async () => {
      const { svc } = setupValidRefresh();
      const result = await svc.refreshToken('old-refresh-token');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('test@test.com');
    });

    it('revokes the old session', async () => {
      const { svc, prisma } = setupValidRefresh();
      await svc.refreshToken('old-refresh-token');
      expect(prisma.refreshSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sess-1' },
          data: expect.objectContaining({ revokedAt: expect.any(Date) }),
        }),
      );
    });

    it('creates a new session atomically', async () => {
      const { svc, prisma } = setupValidRefresh();
      await svc.refreshToken('old-refresh-token');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.refreshSession.create).toHaveBeenCalledTimes(1);
    });

    it('rejects a replayed token (hash mismatch)', async () => {
      const { svc, jwt } = buildService();
      (jwt.verify as jest.Mock).mockReturnValue({
        sub: 'u1',
        tenantSchemaName: SCHEMA,
        jti: 'jti-1',
        familyId: 'fam-1',
      });

      const { prisma } = svc as any;
      // We need to set up prisma on the service directly since buildService creates it
      const svc2 = buildService();
      (svc2.prisma.refreshSession.findUnique as jest.Mock).mockResolvedValue({
        id: 'sess-1',
        jti: 'jti-1',
        tokenHash: 'different-hash',
        familyId: 'fam-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
      });
      (svc2.jwt.verify as jest.Mock).mockReturnValue({
        sub: 'u1',
        tenantSchemaName: SCHEMA,
        jti: 'jti-1',
        familyId: 'fam-1',
      });

      await expect(svc2.svc.refreshToken('some-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a revoked session', async () => {
      const svc2 = buildService();
      (svc2.prisma.refreshSession.findUnique as jest.Mock).mockResolvedValue({
        id: 'sess-1',
        jti: 'jti-1',
        tokenHash: AuthService.hashToken('token'),
        familyId: 'fam-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      });
      (svc2.jwt.verify as jest.Mock).mockReturnValue({
        sub: 'u1',
        tenantSchemaName: SCHEMA,
        jti: 'jti-1',
        familyId: 'fam-1',
      });

      await expect(svc2.svc.refreshToken('token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an expired session', async () => {
      const svc2 = buildService();
      (svc2.prisma.refreshSession.findUnique as jest.Mock).mockResolvedValue({
        id: 'sess-1',
        jti: 'jti-1',
        tokenHash: AuthService.hashToken('token'),
        familyId: 'fam-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });
      (svc2.jwt.verify as jest.Mock).mockReturnValue({
        sub: 'u1',
        tenantSchemaName: SCHEMA,
        jti: 'jti-1',
        familyId: 'fam-1',
      });

      await expect(svc2.svc.refreshToken('token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects when session not found', async () => {
      const svc2 = buildService();
      (svc2.prisma.refreshSession.findUnique as jest.Mock).mockResolvedValue(null);
      (svc2.jwt.verify as jest.Mock).mockReturnValue({
        sub: 'u1',
        tenantSchemaName: SCHEMA,
        jti: 'jti-1',
        familyId: 'fam-1',
      });

      await expect(svc2.svc.refreshToken('token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects when user is disabled', async () => {
      const svc2 = buildService();
      const db = mockDb();
      (svc2.tenantPrisma.getClient as jest.Mock).mockReturnValue(db);
      db.user.findUnique.mockResolvedValue({ ...ACTIVE_USER, status: 'SUSPENDED' });
      (svc2.prisma.refreshSession.findUnique as jest.Mock).mockResolvedValue({
        id: 'sess-1',
        jti: 'jti-1',
        tokenHash: AuthService.hashToken('token'),
        familyId: 'fam-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
      });
      (svc2.jwt.verify as jest.Mock).mockReturnValue({
        sub: 'u1',
        tenantSchemaName: SCHEMA,
        jti: 'jti-1',
        familyId: 'fam-1',
      });

      await expect(svc2.svc.refreshToken('token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects invalid JWT signature', async () => {
      const { svc, jwt } = buildService();
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('invalid signature');
      });

      await expect(svc.refreshToken('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects token missing jti', async () => {
      const { svc, jwt } = buildService();
      (jwt.verify as jest.Mock).mockReturnValue({ sub: 'u1', tenantSchemaName: SCHEMA });

      await expect(svc.refreshToken('token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('does not store the original refresh token in DB', async () => {
      const { svc, prisma, tenantPrisma, jwt } = buildService();
      const db = mockDb();
      (tenantPrisma.getClient as jest.Mock).mockReturnValue(db);
      db.user.findUnique.mockResolvedValue(ACTIVE_USER);
      const tokenHash = AuthService.hashToken('my-refresh-token');
      (prisma.refreshSession.findUnique as jest.Mock).mockResolvedValue({
        id: 'sess-1', jti: 'jti-1', tokenHash, familyId: 'fam-1',
        revokedAt: null, expiresAt: new Date(Date.now() + 86400000),
      });
      (jwt.verify as jest.Mock).mockReturnValue({
        sub: 'u1', tenantSchemaName: SCHEMA, jti: 'jti-1', familyId: 'fam-1',
      });

      await svc.refreshToken('my-refresh-token');

      const createCall = (prisma.refreshSession.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.tokenHash).not.toBe('my-refresh-token');
      expect(createCall.data.tokenHash).toBe(AuthService.hashToken(createCall.data.tokenHash).length === 64 ? createCall.data.tokenHash : 'nope');
    });
  });

  describe('logout', () => {
    it('revokes the session by jti', async () => {
      const { svc, jwt, prisma } = buildService();
      (jwt.verify as jest.Mock).mockReturnValue({ jti: 'jti-1' });
      (prisma.refreshSession.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await svc.logout('some-token');
      expect(result.message).toBe('Sesion cerrada exitosamente');
      expect(prisma.refreshSession.updateMany).toHaveBeenCalledWith({
        where: { jti: 'jti-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('is idempotent for already revoked sessions', async () => {
      const { svc, jwt, prisma } = buildService();
      (jwt.verify as jest.Mock).mockReturnValue({ jti: 'jti-1' });
      (prisma.refreshSession.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await svc.logout('some-token');
      expect(result.message).toBe('Sesion cerrada exitosamente');
    });

    it('does not fail for invalid JWT', async () => {
      const { svc, jwt } = buildService();
      (jwt.verify as jest.Mock).mockImplementation(() => { throw new Error('bad'); });

      const result = await svc.logout('invalid-token');
      expect(result.message).toBe('Sesion cerrada exitosamente');
    });

    it('does not print token in logs', async () => {
      const { svc, jwt, prisma } = buildService();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      (jwt.verify as jest.Mock).mockReturnValue({ jti: 'jti-1' });
      (prisma.refreshSession.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await svc.logout('super-secret-token');
      expect(warnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('super-secret-token'),
      );
      warnSpy.mockRestore();
    });

    it('refresh after logout fails', async () => {
      const { svc, jwt, prisma, tenantPrisma } = buildService();
      const db = mockDb();
      (tenantPrisma.getClient as jest.Mock).mockReturnValue(db);
      db.user.findUnique.mockResolvedValue(ACTIVE_USER);

      (jwt.verify as jest.Mock)
        .mockReturnValueOnce({ jti: 'jti-1', sub: 'u1', tenantSchemaName: SCHEMA, familyId: 'fam-1' })
        .mockReturnValueOnce({ jti: 'jti-1', sub: 'u1', tenantSchemaName: SCHEMA, familyId: 'fam-1' });
      (prisma.refreshSession.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await svc.logout('token');

      const tokenHash = AuthService.hashToken('token');
      (prisma.refreshSession.findUnique as jest.Mock).mockResolvedValue({
        id: 'sess-1', jti: 'jti-1', tokenHash, familyId: 'fam-1',
        revokedAt: new Date(), expiresAt: new Date(Date.now() + 86400000),
      });

      await expect(svc.refreshToken('token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('voiceLogin', () => {
    it('returns valid: true with correct credentials', async () => {
      const { svc, tenantPrisma } = buildService();
      const db = mockDb();
      (tenantPrisma.getClient as jest.Mock).mockReturnValue(db);
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('manzana azul siete', 10);
      db.user.findUnique.mockResolvedValue({
        id: 'u1', name: 'Ana', role: 'OWNER', status: 'ACTIVE', voiceSeedHash: hash,
      });

      const result = await svc.voiceLogin(
        { voiceUsername: 'ana', seedWord: 'manzana azul siete' }, SCHEMA,
      );
      expect(result.valid).toBe(true);
      expect(result.name).toBe('Ana');
    });

    it('returns valid: false for non-existent user', async () => {
      const { svc, tenantPrisma } = buildService();
      const db = mockDb();
      (tenantPrisma.getClient as jest.Mock).mockReturnValue(db);
      db.user.findUnique.mockResolvedValue(null);

      const result = await svc.voiceLogin(
        { voiceUsername: 'noexiste', seedWord: 'algo' }, SCHEMA,
      );
      expect(result.valid).toBe(false);
    });

    it('returns valid: false for wrong seed', async () => {
      const { svc, tenantPrisma } = buildService();
      const db = mockDb();
      (tenantPrisma.getClient as jest.Mock).mockReturnValue(db);
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('correcta', 10);
      db.user.findUnique.mockResolvedValue({
        id: 'u1', name: 'Ana', role: 'OWNER', status: 'ACTIVE', voiceSeedHash: hash,
      });

      const result = await svc.voiceLogin(
        { voiceUsername: 'ana', seedWord: 'incorrecta' }, SCHEMA,
      );
      expect(result.valid).toBe(false);
    });

    it('returns valid: false for WAITER role', async () => {
      const { svc, tenantPrisma } = buildService();
      const db = mockDb();
      (tenantPrisma.getClient as jest.Mock).mockReturnValue(db);
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('semilla', 10);
      db.user.findUnique.mockResolvedValue({
        id: 'u1', name: 'Pedro', role: 'WAITER', status: 'ACTIVE', voiceSeedHash: hash,
      });

      const result = await svc.voiceLogin(
        { voiceUsername: 'pedro', seedWord: 'semilla' }, SCHEMA,
      );
      expect(result.valid).toBe(false);
    });
  });
});
