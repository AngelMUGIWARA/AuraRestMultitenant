/**
 * Seed adicional de desarrollo — datos para que el dashboard de admin
 * muestre información realista:
 *   - 1 sucursal extra (Sucursal Norte)
 *   - Reservaciones de hoy y próximos días (la vista /reservaciones
 *     estaba vacía)
 *
 * Uso: pnpm exec ts-node --project tsconfig.json -r tsconfig-paths/register prisma/seed-demo-extras.ts
 * Idempotente: puede correrse varias veces sin duplicar datos.
 */
import { PrismaClient as TenantClient } from '../src/generated/prisma-tenant';

const TENANT_SCHEMA = 'tenant_ejemplo';
const BASE_URL = process.env.DATABASE_URL ?? '';

const tenantUrl = BASE_URL.includes('?')
  ? `${BASE_URL}&schema=${TENANT_SCHEMA}`
  : `${BASE_URL}?schema=${TENANT_SCHEMA}`;

const db = new TenantClient({ datasources: { db: { url: tenantUrl } } });

/** Fecha de hoy a la hora indicada, con offset opcional de días. */
function at(hour: number, minute = 0, daysFromNow = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  console.log('🌱  Seed de extras para el dashboard...\n');

  // ── 1. Sucursal extra ──────────────────────────────────────
  const norte = await db.branch.upsert({
    where: { slug: 'norte' },
    update: {},
    create: {
      name: 'Sucursal Norte',
      slug: 'norte',
      address: 'Av. de los Pinos 245, Zona Norte',
      phone: '+52 55 0000 0003',
      email: 'norte@demo.com',
      manager: 'Sofía Gerente',
    },
  });
  console.log(`✅  Sucursal:  ${norte.name}`);

  // ── 2. Backfill: órdenes sin sucursal ──────────────────────
  // El seed base crea las órdenes sin branchId, así que el resumen por
  // sucursal del dashboard las ignoraría. Se asignan a la Central.
  const centralForOrders = await db.branch.findUnique({ where: { slug: 'central' } });
  if (centralForOrders) {
    const { count } = await db.order.updateMany({
      where: { branchId: null },
      data: { branchId: centralForOrders.id },
    });
    console.log(`✅  Órdenes:   ${count} asignadas a ${centralForOrders.name}`);
  }

  // ── 3. Reservaciones ───────────────────────────────────────
  const existing = await db.reservation.count();
  if (existing > 0) {
    console.log(`⏭️   Reservaciones: ya hay ${existing}, se omiten`);
    return;
  }

  const central = await db.branch.findUnique({ where: { slug: 'central' } });
  if (!central) throw new Error('No existe la sucursal "central" — corre primero prisma/seed.ts');

  const tables = await db.restaurantTable.findMany({
    where: { branchId: central.id },
    orderBy: { number: 'asc' },
  });
  if (tables.length < 4) throw new Error('Se esperaban ≥4 mesas del seed base');

  const t = (i: number) => tables[i % tables.length].id;

  const reservations = [
    // Hoy
    { tableId: t(0), guestName: 'Valeria Ortiz', guestPhone: '+52 55 1111 0001', partySize: 2, scheduledAt: at(13, 30), status: 'CONFIRMED' as const, notes: 'Mesa junto a la ventana' },
    { tableId: t(1), guestName: 'Héctor Salgado', guestPhone: '+52 55 1111 0002', partySize: 4, scheduledAt: at(14, 0), status: 'ARRIVED' as const },
    { tableId: t(2), guestName: 'Fam. Peralta', guestPhone: '+52 55 1111 0003', guestEmail: 'peralta@mail.com', partySize: 6, scheduledAt: at(15, 0), status: 'PENDING' as const, notes: 'Cumpleaños — llevar pastel' },
    { tableId: t(3), guestName: 'Daniela Ríos', guestPhone: '+52 55 1111 0004', partySize: 2, scheduledAt: at(20, 0), status: 'CONFIRMED' as const },
    { tableId: t(4), guestName: 'Marco Antonio Vela', partySize: 3, scheduledAt: at(21, 0), status: 'PENDING' as const },
    // Mañana
    { tableId: t(0), guestName: 'Lucía Fernández', guestPhone: '+52 55 1111 0005', partySize: 5, scheduledAt: at(13, 0, 1), status: 'CONFIRMED' as const },
    { tableId: t(2), guestName: 'Rodrigo Cámara', partySize: 2, scheduledAt: at(19, 30, 1), status: 'PENDING' as const, notes: 'Aniversario' },
    // Pasado mañana
    { tableId: t(1), guestName: 'Grupo Empresarial MX', guestEmail: 'eventos@gemx.com', partySize: 10, scheduledAt: at(14, 0, 2), status: 'PENDING' as const, notes: 'Comida de negocios — requieren factura' },
    // Histórico (ayer): completada y no-show para las métricas
    { tableId: t(3), guestName: 'Paola Anaya', partySize: 2, scheduledAt: at(14, 0, -1), status: 'COMPLETED' as const },
    { tableId: t(4), guestName: 'Iván Cordero', partySize: 4, scheduledAt: at(20, 30, -1), status: 'NO_SHOW' as const },
  ];

  for (const r of reservations) {
    await db.reservation.create({ data: { ...r, branchId: central.id, durationMinutes: 90 } });
  }
  console.log(`✅  Reservaciones: ${reservations.length} creadas (hoy, mañana y ayer)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
