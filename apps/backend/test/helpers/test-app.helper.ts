import { CanActivate, ExecutionContext, Injectable, NestMiddleware, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Request, Response, NextFunction } from 'express';

// ──────────────────────────────────────────────
// All jest.mock MUST be at module top level
// Use var + closures to avoid hoisting TDZ issues
// ──────────────────────────────────────────────

var _sharedTenantDb: Record<string, any>;
var _mockTenantPrismaService: any;
var _mockActivityLogRepo: any;
var _mockPrismaService: any;

jest.mock('../../src/database/prisma.service', () => {
  return {
    PrismaService: jest.fn(() => {
      const instance = {
        $connect: jest.fn().mockResolvedValue(undefined),
        $disconnect: jest.fn().mockResolvedValue(undefined),
        onModuleInit: jest.fn().mockResolvedValue(undefined),
        onModuleDestroy: jest.fn().mockResolvedValue(undefined),
        tenant: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'tenant-001',
            name: 'Test Restaurant',
            slug: 'test-tenant',
            schemaName: 'test_tenant_schema',
            email: 'admin@test.com',
            phone: '555-0000',
            address: '123 Test St',
            logoUrl: null,
            status: 'ACTIVE',
            plan: 'PRO',
          }),
          findMany: jest.fn().mockResolvedValue([]),
          update: jest.fn(),
        },
        superAdmin: {
          findUnique: jest.fn(),
        },
        systemAuditLog: {
          create: jest.fn().mockResolvedValue(undefined),
          findMany: jest.fn().mockResolvedValue([]),
        },
      };
      _mockPrismaService = instance;
      return instance;
    }),
  };
});

jest.mock('../../src/database/tenant-prisma.service', () => {
  const _mock = {
    getClient: jest.fn(() => _sharedTenantDb),
  };
  _mockTenantPrismaService = _mock;
  return { TenantPrismaService: jest.fn(() => _mock) };
});

jest.mock('../../src/event-bus/event-bus.service', () => {
  const mockEventBus = {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    onModuleDestroy: jest.fn(),
  };
  return { EventBusService: jest.fn(() => mockEventBus) };
});

jest.mock('../../src/activity-log/activity-log.repository', () => {
  const _mock = {
    create: jest.fn().mockResolvedValue(undefined),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
  };
  _mockActivityLogRepo = _mock;
  const MockRepo = jest.fn(() => _mock);
  return { ActivityLogRepository: MockRepo };
});

// Now safe to import — mocked modules will be used
import { DatabaseModule } from '../../src/database/database.module';
import { AuthModule } from '../../src/auth/auth.module';
import { OrdersModule } from '../../src/orders/orders.module';
import { PaymentsModule } from '../../src/payments/payments.module';
import { KitchenModule } from '../../src/kitchen/kitchen.module';
import { ActivityLogModule } from '../../src/activity-log/activity-log.module';
import { HealthModule } from '../../src/health/health.module';
import { SystemAdminModule } from '../../src/system-admin/system-admin.module';

const TENANT_SCHEMA = 'test_tenant_schema';
const TENANT_SLUG = 'test-tenant';

// Initialize the shared tenantDb after imports have resolved
_sharedTenantDb = {};
_sharedTenantDb.$transaction = jest.fn(async (fn: any) => fn(_sharedTenantDb));

@Injectable()
class FakeThrottlerGuard implements CanActivate {
  canActivate(_ctx: ExecutionContext): boolean {
    return true;
  }
}

@Injectable()
class TestTenantMiddleware implements NestMiddleware {
  constructor(private readonly jwt: JwtService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = this.jwt.verify(authHeader.slice(7));
        if (payload?.tenantSchemaName) {
          req['tenant'] = {
            schemaName: payload.tenantSchemaName,
            slug: payload.tenantSlug,
          };
          req['user'] = {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
            tenantSlug: payload.tenantSlug,
            tenantSchemaName: payload.tenantSchemaName,
          };
          return next();
        }
      } catch {
        // fall through
      }
    }

    const slugFromHeader = (req.headers['x-tenant-slug'] as string) ?? TENANT_SLUG;
    if (slugFromHeader) {
      req['tenant'] = {
        id: 'tenant-001',
        name: 'Test Tenant',
        schemaName: TENANT_SCHEMA,
        slug: slugFromHeader,
      };
    }
    next();
  }
}

export function getMockTenantPrisma() {
  return _mockTenantPrismaService;
}

export function getMockActivityLogRepo() {
  return _mockActivityLogRepo;
}

export function getMockPrismaService() {
  return _mockPrismaService;
}

export async function createIntegrationTestApp(): Promise<{
  app: INestApplication;
  jwtService: JwtService;
  tenantDb: Record<string, any>;
  mockTenantPrisma: any;
  mockActivityLogRepo: any;
  mockPrisma: any;
}> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true }),
      DatabaseModule,
      AuthModule,
      OrdersModule,
      PaymentsModule,
      KitchenModule,
      ActivityLogModule,
      HealthModule,
      SystemAdminModule,
    ],
    providers: [
      { provide: APP_GUARD, useClass: FakeThrottlerGuard },
      TestTenantMiddleware,
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.use(
    ((req: any, res: any, next: any) => {
      const instance = new TestTenantMiddleware(moduleFixture.get(JwtService));
      return instance.use(req, res, next);
    }) as any,
  );

  await app.init();

  return {
    app,
    jwtService: moduleFixture.get(JwtService),
    tenantDb: _sharedTenantDb,
    mockTenantPrisma: getMockTenantPrisma(),
    mockActivityLogRepo: getMockActivityLogRepo(),
    mockPrisma: getMockPrismaService(),
  };
}

export function generateAccessToken(jwtService: JwtService, user: {
  id: string;
  email: string;
  role: string;
}): string {
  return jwtService.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantSlug: TENANT_SLUG,
      tenantSchemaName: TENANT_SCHEMA,
    },
    { secret: process.env.JWT_SECRET },
  );
}

export function generateRefreshToken(jwtService: JwtService, user: {
  id: string;
  email: string;
  role: string;
}): string {
  return jwtService.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantSlug: TENANT_SLUG,
      tenantSchemaName: TENANT_SCHEMA,
    },
    {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    },
  );
}

export function generateSystemAdminAccessToken(jwtService: JwtService, superAdmin: {
  id: string;
  email: string;
}): string {
  return jwtService.sign(
    { sub: superAdmin.id, email: superAdmin.email, role: 'SUPER_ADMIN' },
    { secret: process.env.SYSTEM_JWT_SECRET },
  );
}

export function generateSystemAdminRefreshToken(jwtService: JwtService, superAdmin: {
  id: string;
  email: string;
}): string {
  return jwtService.sign(
    { sub: superAdmin.id, email: superAdmin.email, role: 'SUPER_ADMIN' },
    { secret: process.env.SYSTEM_JWT_REFRESH_SECRET, expiresIn: '30d' },
  );
}

export { INestApplication, JwtService };
