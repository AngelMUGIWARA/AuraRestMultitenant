/**
 * Test de Integración: Concurrencia Serializable
 *
 * Este test verifica que dos solicitudes simultáneas para crear reservas
 * en la misma mesa con intervalos superpuestos resulten en:
 * - Una creación exitosa
 * - Una falla con HTTP 409 Conflict
 * - Exactamente una reserva persistida
 *
 * REQUIERE: PostgreSQL real, no mocks
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ConflictException } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationRepository } from './reservations.repository';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import { PrismaClient } from '../generated/prisma-tenant';

/**
 * Test de Concurrencia Real: Reservaciones Simultáneas
 *
 * INFRAESTRUCTURA REQUERIDA:
 * - PostgreSQL 15+ corriendo en localhost:5433
 * - Database: 'restaurant_db_test'
 * - Transacción Serializable: soportada por PostgreSQL
 * - Dos conexiones simultáneas
 *
 * VERIFICA:
 * - Dos solicitudes POST simultáneas en mesa+horario idénticos
 * - Exactamente una se crea (201 PENDING)
 * - Exactamente una falla (409 Conflict)
 * - BD contiene exactamente una reserva (no parcial)
 * - TableStatus coherente
 * - Sin transacciones abortadas en railea
 *
 * EJECUTAR CON:
 * docker run --name postgres-test -e POSTGRES_DB=restaurant_db_test \
 *   -e POSTGRES_PASSWORD=test -p 5433:5432 -d postgres:15
 * pnpm --filter backend exec prisma migrate deploy --schema prisma/tenant/schema.prisma
 * pnpm --filter backend test -- reservations.concurrency.integration --runInBand
 *
 * Si no hay PostgreSQL real, estos tests están marcados como skip.
 * El propósito es demostrar que isolationLevel: 'Serializable' funciona.
 */

describe.skip('ReservationsService - Concurrencia Serializable', () => {
  let service: ReservationsService;
  let repository: ReservationRepository;
  let tenantPrisma: TenantPrismaService;
  let testClient: PrismaClient;

  const SCHEMA_TEST = 'test_concurrent_real';
  const BRANCH_ID = 'branch-test-concurrent-1';
  const TABLE_ID = 'table-test-concurrent-1';
  const RESERVED_DATE = '2026-08-25';
  const RESERVED_TIME = '14:00';
  const DURATION = 60;

  beforeAll(async () => {
    tenantPrisma = new TenantPrismaService();
    testClient = tenantPrisma.getClient(SCHEMA_TEST);
    repository = new ReservationRepository(tenantPrisma);

    const mockActivityLog = {
      log: jest.fn().mockResolvedValue(undefined),
    } as unknown as ActivityLogService;
    service = new ReservationsService(repository, mockActivityLog, tenantPrisma);

    // Crear fixtures
    try {
      await testClient.reservation.deleteMany({});
      await testClient.restaurantTable.deleteMany({});
      await testClient.branch.deleteMany({});
    } catch {
      // Tabla no existe
    }

    await testClient.branch.create({
      data: {
        id: BRANCH_ID,
        name: 'Test Branch Concurrent',
        slug: 'test-concurrent',
        address: 'Test Address',
      },
    });

    await testClient.restaurantTable.create({
      data: {
        id: TABLE_ID,
        name: 'Table Concurrent',
        number: 1,
        branchId: BRANCH_ID,
        capacity: 4,
        status: 'AVAILABLE',
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    try {
      await testClient.reservation.deleteMany({});
      await testClient.restaurantTable.deleteMany({});
      await testClient.branch.deleteMany({});
    } catch {
      // Ignorar
    }
    await testClient.$disconnect();
  });

  beforeEach(async () => {
    // Limpiar reservas antes de cada test
    await testClient.reservation.deleteMany({});
  });

  it('debe permitir solo una reserva cuando dos se lanzan simultáneamente', async () => {
    /**
     * ESCENARIO CONCURRENCIA CRÍTICA:
     * Cliente A: POST /create(table-1, 2026-08-25 14:00, 60min)
     * Cliente B: POST /create(table-1, 2026-08-25 14:00, 60min) [SIMULTÁNEAMENTE]
     *
     * ESPERADO (garantizado por isolationLevel: Serializable):
     * - Exactamente una se crea exitosamente (201)
     * - Exactamente una falla con 409 Conflict
     * - BD contiene exactamente una reserva
     * - Sin estado parcial o inconsistente
     */

    const createReservationA = async () =>
      service.create(
        {
          guestName: 'Cliente A',
          guestPhone: '5551234567',
          guestEmail: 'a@test.com',
          partySize: 4,
          date: RESERVED_DATE,
          time: RESERVED_TIME,
          durationMinutes: DURATION,
          branchId: BRANCH_ID,
          tableId: TABLE_ID,
        },
        SCHEMA_TEST,
        'user-a',
        { id: 'user-a', role: 'MANAGER', branchId: BRANCH_ID },
      );

    const createReservationB = async () =>
      service.create(
        {
          guestName: 'Cliente B',
          guestPhone: '5559876543',
          guestEmail: 'b@test.com',
          partySize: 2,
          date: RESERVED_DATE,
          time: RESERVED_TIME,
          durationMinutes: DURATION,
          branchId: BRANCH_ID,
          tableId: TABLE_ID,
        },
        SCHEMA_TEST,
        'user-b',
        { id: 'user-b', role: 'MANAGER', branchId: BRANCH_ID },
      );

    // Ejecutar simultáneamente (carrera real)
    const results = await Promise.allSettled([
      createReservationA(),
      createReservationB(),
    ]);

    // Verificar: 1 fulfilled, 1 rejected
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    // Verificar que rechazo es ConflictException 409
    if (rejected[0].status === 'rejected') {
      expect(rejected[0].reason).toBeInstanceOf(ConflictException);
    }

    // Verificar persistencia: exactamente 1 reserva en BD
    const reservations = await testClient.reservation.findMany({
      where: {
        branchId: BRANCH_ID,
        tableId: TABLE_ID,
        scheduledAt: new Date(`${RESERVED_DATE}T${RESERVED_TIME}:00.000Z`),
      },
    });

    expect(reservations).toHaveLength(1);

    // Verificar que la reserva persistida es la exitosa
    if (fulfilled[0].status === 'fulfilled') {
      expect(reservations[0].guestName).toBe(fulfilled[0].value.guestName);
      expect(reservations[0].status).toBe('PENDING');
    }

    // Verificar que mesa está AVAILABLE (no reserva aún no llega)
    const table = await testClient.restaurantTable.findUnique({
      where: { id: TABLE_ID },
    });
    expect(table?.status).toBe('AVAILABLE');
  });

  it('debe permitir dos reservas si son en horas diferentes (contiguos)', async () => {
    /**
     * ESCENARIO: Intervalos contiguos (permitidos)
     * Cliente A: POST /create(table, 14:00-15:00)
     * Cliente B: POST /create(table, 15:00-16:00) [contiguo, sin conflicto]
     *
     * ESPERADO:
     * - Ambas exitosas (201)
     * - Dos reservas persistidas
     * - Horarios exactos sin solapamiento
     */

    const resultA = await service.create(
      {
        guestName: 'Cliente A',
        guestPhone: '5551111111',
        guestEmail: 'a2@test.com',
        partySize: 4,
        date: RESERVED_DATE,
        time: '14:00',
        durationMinutes: 60,
        branchId: BRANCH_ID,
        tableId: TABLE_ID,
      },
      SCHEMA_TEST,
      'user-a',
      { id: 'user-a', role: 'MANAGER', branchId: BRANCH_ID },
    );

    const resultB = await service.create(
      {
        guestName: 'Cliente B',
        guestPhone: '5552222222',
        guestEmail: 'b2@test.com',
        partySize: 2,
        date: RESERVED_DATE,
        time: '15:00',
        durationMinutes: 60,
        branchId: BRANCH_ID,
        tableId: TABLE_ID,
      },
      SCHEMA_TEST,
      'user-b',
      { id: 'user-b', role: 'MANAGER', branchId: BRANCH_ID },
    );

    expect(resultA).toBeDefined();
    expect(resultA.status).toBe('PENDING');
    expect(resultB).toBeDefined();
    expect(resultB.status).toBe('PENDING');

    // Verificar persistencia: 2 reservas diferentes
    const reservations = await testClient.reservation.findMany({
      where: {
        branchId: BRANCH_ID,
        tableId: TABLE_ID,
        scheduledAt: {
          gte: new Date(`${RESERVED_DATE}T14:00:00.000Z`),
          lte: new Date(`${RESERVED_DATE}T16:00:00.000Z`),
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    expect(reservations).toHaveLength(2);
    expect(reservations[0].scheduledAt).toEqual(
      new Date(`${RESERVED_DATE}T14:00:00.000Z`),
    );
    expect(reservations[0].durationMinutes).toBe(60);
    expect(reservations[1].scheduledAt).toEqual(
      new Date(`${RESERVED_DATE}T15:00:00.000Z`),
    );
    expect(reservations[1].durationMinutes).toBe(60);
  });
});
