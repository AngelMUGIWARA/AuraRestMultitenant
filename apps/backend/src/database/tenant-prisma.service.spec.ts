jest.mock('../generated/prisma-tenant', () => {
  const instances: Array<{ $disconnect: jest.Mock }> = [];
  const MockClient = jest.fn(() => {
    const inst = { $disconnect: jest.fn().mockResolvedValue(undefined) };
    instances.push(inst);
    return inst;
  });
  (MockClient as any)._instances = instances;
  return { PrismaClient: MockClient };
});

import { TenantPrismaService } from './tenant-prisma.service';
import { PrismaClient } from '../generated/prisma-tenant';

const MockPrismaClient = PrismaClient as jest.Mock;

function getInstances(): Array<{ $disconnect: jest.Mock }> {
  return (MockPrismaClient as any)._instances;
}

describe('TenantPrismaService', () => {
  let service: TenantPrismaService;

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
    process.env.TENANT_PRISMA_MAX_CLIENTS = '3';
    process.env.TENANT_PRISMA_CLIENT_TTL_MS = '50000';
    process.env.TENANT_PRISMA_CLEANUP_INTERVAL_MS = '60000';
    jest.clearAllMocks();
    getInstances().length = 0; // reset
    service = new TenantPrismaService(undefined as any);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  // ── Mismo schema → misma instancia ────────────────────────

  it('debe retornar la misma instancia para el mismo schemaName', () => {
    const a = service.getClient('tenant_one');
    const b = service.getClient('tenant_one');
    expect(a).toBe(b);
  });

  // ── Actualización de orden LRU al acceder ─────────────────

  it('debe actualizar el orden LRU al acceder a un cliente existente', () => {
    service.getClient('tenant_one');
    service.getClient('tenant_two');
    service.getClient('tenant_one');

    const keys = Array.from((service as any).clients.keys());
    expect(keys).toEqual(['tenant_two', 'tenant_one']);
  });

  // ── Dos schemas → instancias distintas ────────────────────

  it('debe crear instancias distintas para schemas diferentes', () => {
    const a = service.getClient('tenant_one');
    const b = service.getClient('tenant_two');
    expect(a).not.toBe(b);
    expect(getInstances().length).toBe(2);
  });

  // ── Evicción LRU con cliente inactivo ─────────────────────

  it('debe expulsar al cliente inactivo cuando se supera maxClients', () => {
    const ttlMs = 50;
    process.env.TENANT_PRISMA_MAX_CLIENTS = '2';
    process.env.TENANT_PRISMA_CLIENT_TTL_MS = String(ttlMs);
    const svc = new TenantPrismaService(undefined as any);

    const clients = [
      svc.getClient('tenant_one'),
      svc.getClient('tenant_two'),
    ];

    // Envejecer primer cliente
    const entryOne = (svc as any).clients.get('tenant_one');
    entryOne.lastUsed = Date.now() - ttlMs - 1;

    svc.getClient('tenant_three');

    expect((svc as any).clients.has('tenant_one')).toBe(false);
    expect(clients[0].$disconnect).toHaveBeenCalled();
    svc.onModuleDestroy();
  });

  // ── No expulsar clientes recientes ────────────────────────

  it('no debe expulsar clientes recientes solo por superar el límite', () => {
    process.env.TENANT_PRISMA_MAX_CLIENTS = '2';
    const svc = new TenantPrismaService(undefined as any);

    svc.getClient('tenant_one');
    svc.getClient('tenant_two');
    svc.getClient('tenant_three');

    expect((svc as any).clients.size).toBe(3);
    svc.onModuleDestroy();
  });

  // ── TTL ───────────────────────────────────────────────────

  it('debe eliminar clientes inactivos por TTL durante limpieza', () => {
    const ttlMs = 50;
    process.env.TENANT_PRISMA_CLIENT_TTL_MS = String(ttlMs);
    process.env.TENANT_PRISMA_CLEANUP_INTERVAL_MS = String(ttlMs);
    const svc = new TenantPrismaService(undefined as any);

    svc.getClient('tenant_one');
    svc.getClient('tenant_two');

    const oldTime = Date.now() - ttlMs - 1;
    (svc as any).clients.forEach((entry: any) => {
      entry.lastUsed = oldTime;
    });

    (svc as any).cleanupExpired();

    expect((svc as any).clients.size).toBe(0);
    svc.onModuleDestroy();
  });

  // ── $disconnect al expulsar por límite ────────────────────

  it('debe llamar $disconnect en cliente expulsado por límite', () => {
    process.env.TENANT_PRISMA_MAX_CLIENTS = '1';
    const svc = new TenantPrismaService(undefined as any);

    const first = svc.getClient('tenant_one');
    const entryOne = (svc as any).clients.get('tenant_one');
    entryOne.lastUsed = Date.now() - 100_000;

    svc.getClient('tenant_two');

    expect(first.$disconnect).toHaveBeenCalled();
    svc.onModuleDestroy();
  });

  // ── $disconnect al expulsar por TTL ───────────────────────

  it('debe llamar $disconnect en cliente expulsado por TTL', () => {
    const ttlMs = 50;
    process.env.TENANT_PRISMA_CLIENT_TTL_MS = String(ttlMs);
    const svc = new TenantPrismaService(undefined as any);

    const first = svc.getClient('tenant_one');
    const entryOne = (svc as any).clients.get('tenant_one');
    entryOne.lastUsed = Date.now() - ttlMs - 1;

    (svc as any).cleanupExpired();

    expect(first.$disconnect).toHaveBeenCalled();
    svc.onModuleDestroy();
  });

  // ── onModuleDestroy ───────────────────────────────────────

  it('debe desconectar todos los clientes en onModuleDestroy', async () => {
    service.getClient('tenant_one');
    service.getClient('tenant_two');

    // Collect disconnect spies from instances
    const spies = getInstances().map((i) => i.$disconnect);

    await service.onModuleDestroy();

    expect((service as any).clients.size).toBe(0);
    spies.forEach((s) => expect(s).toHaveBeenCalled());
  });

  it('debe limpiar el timer en onModuleDestroy', async () => {
    service.getClient('tenant_one');
    await service.onModuleDestroy();
    expect((service as any).cleanupTimer).toBeNull();
  });

  // ── timer unref ───────────────────────────────────────────

  it('el cleanupTimer debe tener unref disponible', () => {
    const timer = (service as any).cleanupTimer;
    expect(timer).not.toBeNull();
    expect(typeof timer?.unref).toBe('function');
  });

  // ── schemaName inválido ───────────────────────────────────

  it('debe rechazar schemaName undefined', () => {
    expect(() => service.getClient(undefined as any)).toThrow('schemaName es requerido');
  });

  it('debe rechazar schemaName null', () => {
    expect(() => service.getClient(null as any)).toThrow('schemaName es requerido');
  });

  it('debe rechazar schemaName vacío', () => {
    expect(() => service.getClient('')).toThrow('no puede estar vacío');
  });

  it('debe rechazar schemaName con espacios', () => {
    expect(() => service.getClient('tenant one')).toThrow('contener espacios');
  });

  it('debe rechazar schemaName con caracteres inválidos', () => {
    expect(() => service.getClient("tenant';DROP_TABLE;--")).toThrow('caracteres no válidos');
  });

  // ── Configuración inválida usa defaults ───────────────────

  it('debe usar defaults si TENANT_PRISMA_MAX_CLIENTS no es número válido', () => {
    process.env.TENANT_PRISMA_MAX_CLIENTS = 'cero';
    const svc = new TenantPrismaService(undefined as any);
    expect((svc as any).maxClients).toBe(10);
    svc.onModuleDestroy();
  });

  it('debe usar defaults con NaN', () => {
    process.env.TENANT_PRISMA_CLIENT_TTL_MS = 'NaN';
    const svc = new TenantPrismaService(undefined as any);
    expect((svc as any).ttlMs).toBe(300_000);
    svc.onModuleDestroy();
  });

  it('debe usar defaults con 0 o negativo', () => {
    process.env.TENANT_PRISMA_MAX_CLIENTS = '0';
    let svc = new TenantPrismaService(undefined as any);
    expect((svc as any).maxClients).toBe(10);
    svc.onModuleDestroy();

    process.env.TENANT_PRISMA_MAX_CLIENTS = '-5';
    svc = new TenantPrismaService(undefined as any);
    expect((svc as any).maxClients).toBe(10);
    svc.onModuleDestroy();
  });
});
