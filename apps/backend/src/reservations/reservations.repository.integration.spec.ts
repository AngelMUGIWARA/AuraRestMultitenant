/**
 * Tests de Integración: ReservationRepository contra PostgreSQL REAL
 *
 * INFRAESTRUCTURA REQUERIDA:
 * - PostgreSQL 15+ corriendo en localhost:5433
 * - Database: 'restaurant_db_test'
 * - Connection string: postgresql://user:pass@localhost:5433/restaurant_db_test
 * - Esquema dinámico creado por Prisma (multi-tenancy)
 *
 * EJECUTAR CON:
 * docker run --name postgres-test -e POSTGRES_DB=restaurant_db_test \
 *   -e POSTGRES_PASSWORD=test -p 5433:5432 -d postgres:15
 * pnpm --filter backend exec prisma migrate deploy --schema prisma/tenant/schema.prisma
 * pnpm --filter backend test -- reservations.repository.integration --runInBand
 *
 * Estos tests NO se ejecutan en CI/CD sin Docker.
 * El propósito es verificar SQL parametrizado y fórmula de solapamiento contra BD real.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ReservationRepository } from './reservations.repository';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import { Prisma, PrismaClient } from '../generated/prisma-tenant';

describe.skip('ReservationRepository - Integración PostgreSQL', () => {
  let repository: ReservationRepository;
  let tenantPrisma: TenantPrismaService;
  let testClient: PrismaClient;

  const TEST_SCHEMA = 'test_overlap_integration';
  const BRANCH_ID = 'branch-integration-test';
  const TABLE_ID = 'table-integration-test';
  const BASE_DATE = new Date('2026-08-25T10:00:00.000Z');

  beforeAll(async () => {
    tenantPrisma = new TenantPrismaService();
    testClient = tenantPrisma.getClient(TEST_SCHEMA);
    repository = new ReservationRepository(tenantPrisma);

    // Limpiar y crear datos de prueba
    try {
      await testClient.reservation.deleteMany({});
      await testClient.restaurantTable.deleteMany({});
      await testClient.branch.deleteMany({});
    } catch {
      // Tabla no existe
    }

    // Crear fixture: branch
    await testClient.branch.create({
      data: {
        id: BRANCH_ID,
        name: 'Test Branch',
        slug: 'test-branch',
        address: 'Test Address',
      },
    });

    // Crear fixture: mesa
    await testClient.restaurantTable.create({
      data: {
        id: TABLE_ID,
        name: 'Table 1',
        number: 1,
        branchId: BRANCH_ID,
        capacity: 4,
        status: 'AVAILABLE',
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    // Limpiar
    await testClient.reservation.deleteMany({});
    await testClient.restaurantTable.deleteMany({});
    await testClient.branch.deleteMany({});
    await testClient.$disconnect();
  });

  afterEach(async () => {
    // Limpiar reservas entre tests
    await testClient.reservation.deleteMany({});
  });

  describe('findOverlappingReservation - Casos de Solapamiento', () => {
    it('debe detectar cuando nueva inicio está dentro de existente', async () => {
      // Existente: 10:00-11:00
      // Nueva:    10:30-11:30 → CONFLICTO (inicio dentro)
      const existingStart = new Date(BASE_DATE);
      const newStart = new Date(BASE_DATE.getTime() + 30 * 60000);
      const newEnd = new Date(BASE_DATE.getTime() + 90 * 60000);

      await testClient.reservation.create({
        data: {
          guestName: 'Guest A',
          guestPhone: '5551234567',
          guestEmail: 'a@test.com',
          partySize: 2,
          scheduledAt: existingStart,
          durationMinutes: 60,
          status: 'PENDING',
          branchId: BRANCH_ID,
          tableId: TABLE_ID,
        },
      });

      await testClient.$transaction(async (tx) => {
        const conflict = await repository['findOverlappingReservation'](
          tx,
          BRANCH_ID,
          TABLE_ID,
          newStart,
          newEnd,
        );

        expect(conflict).not.toBeNull();
        expect(conflict?.scheduledAt.getTime()).toBe(existingStart.getTime());
      });
    });

    it('debe detectar cuando nueva fin está dentro de existente', async () => {
      // Existente: 10:00-11:00
      // Nueva:    09:30-10:30 → CONFLICTO (fin dentro)
      const existingStart = new Date(BASE_DATE);
      const newStart = new Date(BASE_DATE.getTime() - 30 * 60000);
      const newEnd = new Date(BASE_DATE.getTime() + 30 * 60000);

      await testClient.reservation.create({
        data: {
          guestName: 'Guest B',
          guestPhone: '5555555555',
          guestEmail: 'b@test.com',
          partySize: 2,
          scheduledAt: existingStart,
          durationMinutes: 60,
          status: 'PENDING',
          branchId: BRANCH_ID,
          tableId: TABLE_ID,
        },
      });

      await testClient.$transaction(async (tx) => {
        const conflict = await repository['findOverlappingReservation'](
          tx,
          BRANCH_ID,
          TABLE_ID,
          newStart,
          newEnd,
        );

        expect(conflict).not.toBeNull();
      });
    });

    it('debe detectar cuando nueva envuelve existente', async () => {
      // Existente: 10:00-11:00
      // Nueva:    09:00-12:00 → CONFLICTO (envuelve)
      const existingStart = new Date(BASE_DATE);
      const newStart = new Date(BASE_DATE.getTime() - 60 * 60000);
      const newEnd = new Date(BASE_DATE.getTime() + 120 * 60000);

      await testClient.reservation.create({
        data: {
          guestName: 'Guest C',
          guestPhone: '5559876543',
          guestEmail: 'c@test.com',
          partySize: 2,
          scheduledAt: existingStart,
          durationMinutes: 60,
          status: 'PENDING',
          branchId: BRANCH_ID,
          tableId: TABLE_ID,
        },
      });

      await testClient.$transaction(async (tx) => {
        const conflict = await repository['findOverlappingReservation'](
          tx,
          BRANCH_ID,
          TABLE_ID,
          newStart,
          newEnd,
        );

        expect(conflict).not.toBeNull();
      });
    });

    it('debe permitir intervalos contiguos (fin=inicio)', async () => {
      // Existente: 10:00-11:00
      // Nueva:    11:00-12:00 → SIN CONFLICTO (contiguos)
      const existingStart = new Date(BASE_DATE);
      const newStart = new Date(BASE_DATE.getTime() + 60 * 60000);
      const newEnd = new Date(BASE_DATE.getTime() + 120 * 60000);

      await testClient.reservation.create({
        data: {
          guestName: 'Guest D',
          guestPhone: '5550000000',
          guestEmail: 'd@test.com',
          partySize: 2,
          scheduledAt: existingStart,
          durationMinutes: 60,
          status: 'PENDING',
          branchId: BRANCH_ID,
          tableId: TABLE_ID,
        },
      });

      await testClient.$transaction(async (tx) => {
        const conflict = await repository['findOverlappingReservation'](
          tx,
          BRANCH_ID,
          TABLE_ID,
          newStart,
          newEnd,
        );

        expect(conflict).toBeNull();
      });
    });

    it('debe ignorar estado CANCELLED', async () => {
      // Existente CANCELLED: 10:00-11:00
      // Nueva:              10:30-11:30 → SIN CONFLICTO (CANCELLED ignorado)
      const existingStart = new Date(BASE_DATE);
      const newStart = new Date(BASE_DATE.getTime() + 30 * 60000);
      const newEnd = new Date(BASE_DATE.getTime() + 90 * 60000);

      await testClient.reservation.create({
        data: {
          guestName: 'Guest E',
          guestPhone: '5551111111',
          guestEmail: 'e@test.com',
          partySize: 2,
          scheduledAt: existingStart,
          durationMinutes: 60,
          status: 'CANCELLED',
          branchId: BRANCH_ID,
          tableId: TABLE_ID,
        },
      });

      await testClient.$transaction(async (tx) => {
        const conflict = await repository['findOverlappingReservation'](
          tx,
          BRANCH_ID,
          TABLE_ID,
          newStart,
          newEnd,
        );

        expect(conflict).toBeNull();
      });
    });

    it('debe ignorar estado COMPLETED', async () => {
      // Existente COMPLETED: 10:00-11:00
      // Nueva:               10:30-11:30 → SIN CONFLICTO (COMPLETED ignorado)
      const existingStart = new Date(BASE_DATE);
      const newStart = new Date(BASE_DATE.getTime() + 30 * 60000);
      const newEnd = new Date(BASE_DATE.getTime() + 90 * 60000);

      await testClient.reservation.create({
        data: {
          guestName: 'Guest F',
          guestPhone: '5552222222',
          guestEmail: 'f@test.com',
          partySize: 2,
          scheduledAt: existingStart,
          durationMinutes: 60,
          status: 'COMPLETED',
          branchId: BRANCH_ID,
          tableId: TABLE_ID,
        },
      });

      await testClient.$transaction(async (tx) => {
        const conflict = await repository['findOverlappingReservation'](
          tx,
          BRANCH_ID,
          TABLE_ID,
          newStart,
          newEnd,
        );

        expect(conflict).toBeNull();
      });
    });

    it('debe filtrar por branchId', async () => {
      // Existente en BRANCH_ID: 10:00-11:00
      // Nueva en OTRA rama:      10:30-11:30 → SIN CONFLICTO (otra rama)
      const existingStart = new Date(BASE_DATE);
      const newStart = new Date(BASE_DATE.getTime() + 30 * 60000);
      const newEnd = new Date(BASE_DATE.getTime() + 90 * 60000);

      await testClient.reservation.create({
        data: {
          guestName: 'Guest G',
          guestPhone: '5553333333',
          guestEmail: 'g@test.com',
          partySize: 2,
          scheduledAt: existingStart,
          durationMinutes: 60,
          status: 'PENDING',
          branchId: BRANCH_ID,
          tableId: TABLE_ID,
        },
      });

      await testClient.$transaction(async (tx) => {
        const conflict = await repository['findOverlappingReservation'](
          tx,
          'branch-different',
          TABLE_ID,
          newStart,
          newEnd,
        );

        expect(conflict).toBeNull();
      });
    });

    it('debe filtrar por tableId', async () => {
      // Existente en TABLE_ID: 10:00-11:00
      // Nueva en OTRA mesa:    10:30-11:30 → SIN CONFLICTO (otra mesa)
      const existingStart = new Date(BASE_DATE);
      const newStart = new Date(BASE_DATE.getTime() + 30 * 60000);
      const newEnd = new Date(BASE_DATE.getTime() + 90 * 60000);

      await testClient.reservation.create({
        data: {
          guestName: 'Guest H',
          guestPhone: '5554444444',
          guestEmail: 'h@test.com',
          partySize: 2,
          scheduledAt: existingStart,
          durationMinutes: 60,
          status: 'PENDING',
          branchId: BRANCH_ID,
          tableId: TABLE_ID,
        },
      });

      await testClient.$transaction(async (tx) => {
        const conflict = await repository['findOverlappingReservation'](
          tx,
          BRANCH_ID,
          'table-different',
          newStart,
          newEnd,
        );

        expect(conflict).toBeNull();
      });
    });

    it('debe excluir reserva específica si se proporciona excludeReservationId', async () => {
      // Crear dos existentes
      const existing1Start = new Date(BASE_DATE);
      const existing2Start = new Date(BASE_DATE.getTime() + 120 * 60000);
      const newStart = new Date(BASE_DATE.getTime() + 30 * 60000);
      const newEnd = new Date(BASE_DATE.getTime() + 90 * 60000);

      const res1 = await testClient.reservation.create({
        data: {
          guestName: 'Guest I1',
          guestPhone: '5555555551',
          guestEmail: 'i1@test.com',
          partySize: 2,
          scheduledAt: existing1Start,
          durationMinutes: 60,
          status: 'PENDING',
          branchId: BRANCH_ID,
          tableId: TABLE_ID,
        },
      });

      await testClient.reservation.create({
        data: {
          guestName: 'Guest I2',
          guestPhone: '5555555552',
          guestEmail: 'i2@test.com',
          partySize: 2,
          scheduledAt: existing2Start,
          durationMinutes: 60,
          status: 'PENDING',
          branchId: BRANCH_ID,
          tableId: TABLE_ID,
        },
      });

      // Sin exclusión: debe encontrar res1
      await testClient.$transaction(async (tx) => {
        const conflict = await repository['findOverlappingReservation'](
          tx,
          BRANCH_ID,
          TABLE_ID,
          newStart,
          newEnd,
        );

        expect(conflict).not.toBeNull();
        expect(conflict?.id).toBe(res1.id);
      });

      // Con exclusión de res1: debe devolver null (res1 excluido, res2 está fuera del rango)
      await testClient.$transaction(async (tx) => {
        const conflict = await repository['findOverlappingReservation'](
          tx,
          BRANCH_ID,
          TABLE_ID,
          newStart,
          newEnd,
          res1.id,
        );

        expect(conflict).toBeNull();
      });
    });

    it('debe detectar primer conflicto cuando hay múltiples candidatos', async () => {
      // Crear tres reservas
      const res1Start = new Date(BASE_DATE);
      const res2Start = new Date(BASE_DATE.getTime() + 120 * 60000);
      const res3Start = new Date(BASE_DATE.getTime() + 240 * 60000);

      const res1 = await testClient.reservation.create({
        data: {
          guestName: 'Guest J1',
          guestPhone: '5556666661',
          guestEmail: 'j1@test.com',
          partySize: 2,
          scheduledAt: res1Start,
          durationMinutes: 60,
          status: 'PENDING',
          branchId: BRANCH_ID,
          tableId: TABLE_ID,
        },
      });

      await testClient.reservation.create({
        data: {
          guestName: 'Guest J2',
          guestPhone: '5556666662',
          guestEmail: 'j2@test.com',
          partySize: 2,
          scheduledAt: res2Start,
          durationMinutes: 60,
          status: 'PENDING',
          branchId: BRANCH_ID,
          tableId: TABLE_ID,
        },
      });

      await testClient.reservation.create({
        data: {
          guestName: 'Guest J3',
          guestPhone: '5556666663',
          guestEmail: 'j3@test.com',
          partySize: 2,
          scheduledAt: res3Start,
          durationMinutes: 60,
          status: 'PENDING',
          branchId: BRANCH_ID,
          tableId: TABLE_ID,
        },
      });

      // Nueva en rango que incluye res1, res2, res3
      const newStart = new Date(BASE_DATE.getTime() - 30 * 60000);
      const newEnd = new Date(BASE_DATE.getTime() + 270 * 60000);

      await testClient.$transaction(async (tx) => {
        const conflict = await repository['findOverlappingReservation'](
          tx,
          BRANCH_ID,
          TABLE_ID,
          newStart,
          newEnd,
        );

        expect(conflict).not.toBeNull();
        // LIMIT 1 devuelve el primero
        expect(conflict?.id).toBe(res1.id);
      });
    });
  });
});
