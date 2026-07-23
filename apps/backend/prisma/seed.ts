/**
 * Seed de desarrollo — AuraRest Multitenant
 *
 * Crea un tenant de prueba y pobla su schema con:
 *  - 1 tenant (public.tenants)
 *  - 3 usuarios (owner, mesero, cajero)
 *  - 4 categorías + 12 platillos
 *  - 6 mesas
 *  - 1 orden de ejemplo con 2 items (IN_PROGRESS)
 *  - 18 órdenes PAID de demo para reportes (ventas/productos/pagos/horarios
 *    pico), repartidas en los últimos 7 días, el resto del mes actual y
 *    meses anteriores del año — todas con fechas relativas a "hoy" para
 *    seguir siendo válidas sin importar cuándo se corra el seed.
 *
 * Uso:
 *   pnpm --filter backend exec ts-node prisma/seed.ts
 *   o desde apps/backend:
 *   npx ts-node prisma/seed.ts
 */

import * as bcrypt from 'bcrypt';
import { PrismaClient as SystemClient } from '../src/generated/prisma-system';
import { PrismaClient as TenantClient } from '../src/generated/prisma-tenant';

// ─── Configuración ────────────────────────────────────────────────────────────

const BASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://postgres:root@localhost:5432/aura_rest';

const TENANT_SLUG = 'demo';
const TENANT_SCHEMA = 'tenant_ejemplo'; // schema ya migrado
const BCRYPT_ROUNDS = 10;

// ─── Clientes Prisma ──────────────────────────────────────────────────────────

const systemDb = new SystemClient({ datasources: { db: { url: BASE_URL } } });

const tenantUrl = BASE_URL.includes('?')
  ? `${BASE_URL}&schema=${TENANT_SCHEMA}`
  : `${BASE_URL}?schema=${TENANT_SCHEMA}`;

const tenantDb = new TenantClient({ datasources: { db: { url: tenantUrl } } });

// ─── Helpers ──────────────────────────────────────────────────────────────────

const hash = (plain: string) => bcrypt.hash(plain, BCRYPT_ROUNDS);

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱  Iniciando seed...\n');

  // ── 1. Tenant ──────────────────────────────────────────────────────────────
  const tenant = await systemDb.tenant.upsert({
    where: { slug: TENANT_SLUG },
    update: {},
    create: {
      name: 'Restaurante Demo',
      slug: TENANT_SLUG,
      schemaName: TENANT_SCHEMA,
      email: 'contacto@demo.com',
      phone: '+52 55 0000 0001',
      address: 'Av. Principal 123, Ciudad de México',
      status: 'ACTIVE',
      plan: 'PRO',
    },
  });
  console.log(`✅  Tenant:    ${tenant.name}  (slug: ${tenant.slug})`);

  // ── 2. Usuarios ────────────────────────────────────────────────────────────
  const users = await Promise.all([
    tenantDb.user.upsert({
      where: { email: 'owner@demo.com' },
      update: {},
      create: {
        name: 'Carlos Dueño',
        email: 'owner@demo.com',
        passwordHash: await hash('Owner123'),
        role: 'OWNER',
        status: 'ACTIVE',
        phone: '+52 55 1111 0001',
      },
    }),
    tenantDb.user.upsert({
      where: { email: 'admin@demo.com' },
      update: {},
      create: {
        name: 'Laura Admin',
        email: 'admin@demo.com',
        passwordHash: await hash('Admin123'),
        role: 'ADMIN',
        status: 'ACTIVE',
        phone: '+52 55 1111 0002',
      },
    }),
    tenantDb.user.upsert({
      where: { email: 'mesero@demo.com' },
      update: {},
      create: {
        name: 'Pedro Mesero',
        email: 'mesero@demo.com',
        passwordHash: await hash('Mesero123'),
        role: 'WAITER',
        status: 'ACTIVE',
      },
    }),
    tenantDb.user.upsert({
      where: { email: 'cajero@demo.com' },
      update: {},
      create: {
        name: 'Ana Cajera',
        email: 'cajero@demo.com',
        passwordHash: await hash('Cajero123'),
        role: 'CASHIER',
        status: 'ACTIVE',
      },
    }),
    tenantDb.user.upsert({
      where: { email: 'chef@demo.com' },
      update: {},
      create: {
        name: 'Marco Chef',
        email: 'chef@demo.com',
        passwordHash: await hash('Chef1234'),
        role: 'CHEF',
        status: 'ACTIVE',
      },
    }),
  ]);
  console.log(`✅  Usuarios:  ${users.map((u) => u.role).join(', ')}`);

  // ── 2.b Roles y Branch para pruebas ──────────────────────────────────────
  const roles = await tenantDb.role.findMany();
  if (roles.length === 0) {
    await Promise.all([
      tenantDb.role.create({ data: { name: 'OWNER' } }),
      tenantDb.role.create({ data: { name: 'ADMIN' } }),
      tenantDb.role.create({ data: { name: 'MANAGER' } }),
      tenantDb.role.create({ data: { name: 'WAITER' } }),
      tenantDb.role.create({ data: { name: 'CASHIER' } }),
      tenantDb.role.create({ data: { name: 'CHEF' } }),
    ]);
    console.log('✅  Roles: OWNER, ADMIN, MANAGER, WAITER, CASHIER, CHEF');
  }

  const branch = await tenantDb.branch.upsert({
    where: { slug: 'central' },
    update: {},
    create: { name: 'Sucursal Central', slug: 'central', address: 'Centro', phone: '+52 55 0000 0002' },
  });

  // Asignar algunos users a la branch con roles
  const ownerRole = await tenantDb.role.findUnique({ where: { name: 'OWNER' } });
  const adminRole = await tenantDb.role.findUnique({ where: { name: 'ADMIN' } });

  if (ownerRole) {
    await tenantDb.userBranch.upsert({
      where: { userId_branchId: { userId: users[0].id, branchId: branch.id } },
      update: {},
      create: { userId: users[0].id, branchId: branch.id, roleId: ownerRole.id },
    });
  }

  if (adminRole) {
    await tenantDb.userBranch.upsert({
      where: { userId_branchId: { userId: users[1].id, branchId: branch.id } },
      update: {},
      create: { userId: users[1].id, branchId: branch.id, roleId: adminRole.id },
    });
  }

  // ── 2.c Configuración fiscal (Settings) ────────────────────────────────────
  //
  // The tax rate is stored as a decimal fraction in the Settings table.
  // Value format: "0.15" = 15% (NOT "16", NOT "16%", NOT "1.16").
  // The backend reads this via TaxConfigService.getTaxRate(branchId).
  // If absent, DEFAULT_TAX_RATE (0.15) is used.
  //
  // FIXTURE NOTE: Order monetary amounts below are computed with rate 0.15.
  // If you change this rate, update all fixture amounts accordingly:
  //   tax = subtotal × rate
  //   total = subtotal + tax
  const DEMO_TAX_RATE = '0.15';
  await tenantDb.settings.upsert({
    where: { branchId_key: { branchId: branch.id, key: 'tax_rate' } },
    update: { value: DEMO_TAX_RATE },
    create: { branchId: branch.id, key: 'tax_rate', value: DEMO_TAX_RATE },
  });
  console.log(`✅  Settings:  tax_rate = ${DEMO_TAX_RATE} (sucursal ${branch.slug})`);

  // ── 3. Categorías ──────────────────────────────────────────────────────────
  const [entradas, fuertes, bebidas, postres] = await Promise.all([
    tenantDb.category.upsert({
      where: { name: 'Entradas' },
      update: {},
      create: { name: 'Entradas', description: 'Para abrir el apetito', sortOrder: 1 },
    }),
    tenantDb.category.upsert({
      where: { name: 'Platos Fuertes' },
      update: {},
      create: { name: 'Platos Fuertes', description: 'El plato principal', sortOrder: 2 },
    }),
    tenantDb.category.upsert({
      where: { name: 'Bebidas' },
      update: {},
      create: { name: 'Bebidas', description: 'Refrescantes y calientes', sortOrder: 3 },
    }),
    tenantDb.category.upsert({
      where: { name: 'Postres' },
      update: {},
      create: { name: 'Postres', description: 'El toque dulce final', sortOrder: 4 },
    }),
  ]);
  console.log(`✅  Categorías: Entradas, Platos Fuertes, Bebidas, Postres`);

  // ── 4. Platillos ───────────────────────────────────────────────────────────
  const menuItems = [
    // Entradas
    { name: 'Sopa de Lima', description: 'Tradicional sopa yucateca con pollo', price: 85, categoryId: entradas.id },
    { name: 'Guacamole con Totopos', description: 'Aguacate Hass con chips artesanales', price: 95, categoryId: entradas.id },
    { name: 'Queso Fundido', description: 'Queso chihuahua con chorizo', price: 110, categoryId: entradas.id },
    // Platos Fuertes
    { name: 'Arrachera a las Brasas', description: '300g de arrachera marinada con papas', price: 285, categoryId: fuertes.id },
    { name: 'Pescado a la Veracruzana', description: 'Filete de huachinango con salsa criolla', price: 245, categoryId: fuertes.id },
    { name: 'Pollo en Mole Negro', description: 'Pieza de pollo con mole de Oaxaca', price: 195, categoryId: fuertes.id },
    { name: 'Enchiladas Verdes', description: 'Tres enchiladas con pollo y crema', price: 165, categoryId: fuertes.id },
    // Bebidas
    { name: 'Agua de Horchata', description: '1L de horchata artesanal', price: 55, categoryId: bebidas.id },
    { name: 'Limonada Mineral', description: 'Con menta fresca', price: 65, categoryId: bebidas.id },
    { name: 'Café de Olla', description: 'Canela y piloncillo', price: 45, categoryId: bebidas.id },
    // Postres
    { name: 'Flan Napolitano', description: 'Con cajeta y nuez', price: 75, categoryId: postres.id },
    { name: 'Pastel de Tres Leches', description: 'Porción con fresas', price: 85, categoryId: postres.id },
  ];

  for (const item of menuItems) {
    await tenantDb.menuItem.upsert({
      where: { name_categoryId: { name: item.name, categoryId: item.categoryId } },
      update: {},
      create: { ...item, status: 'AVAILABLE', isAvailable: true },
    });
  }
  console.log(`✅  Platillos: ${menuItems.length} items en 4 categorías`);

  // ── 5. Mesas ───────────────────────────────────────────────────────────────
  const tables = [
    { number: 1, capacity: 2, name: 'Mesa 1', locationZone: 'Terraza' },
    { number: 2, capacity: 4, name: 'Mesa 2', locationZone: 'Terraza' },
    { number: 3, capacity: 4, name: 'Mesa 3', locationZone: 'Interior' },
    { number: 4, capacity: 6, name: 'Mesa 4', locationZone: 'Interior' },
    { number: 5, capacity: 8, name: 'Mesa 5 — Salón Privado', locationZone: 'VIP' },
    { number: 6, capacity: 2, name: 'Barra 1', locationZone: 'Barra' },
  ];

  for (const table of tables) {
    await tenantDb.restaurantTable.upsert({
      where: {
        number_branchId: { number: table.number,
          branchId: branch.id // Asegúrate de tener el ID de la sucursal aquí
        }
      },
      update: {},
      create: {
        ...table,
        status: 'AVAILABLE',
        isActive: true,
        branchId: branch.id // <--- ESTO ES LO QUE FALTA
      }
    });
  }
  console.log(`✅  Mesas:    ${tables.length} mesas`);

  // ── 6. Orden de ejemplo ────────────────────────────────────────────────────
  const mesero = users.find((u) => u.role === 'WAITER')!;
  const mesa3 = await tenantDb.restaurantTable.findUnique({ 
    where: { 
      number_branchId: { 
        number: 3, 
        branchId: branch.id
      } 
    } 
  });
  const arrachera = await tenantDb.menuItem.findFirst({ where: { name: 'Arrachera a las Brasas' } });
  const horchata = await tenantDb.menuItem.findFirst({ where: { name: 'Agua de Horchata' } });

  const existingOrder = await tenantDb.order.findUnique({ where: { folio: 'ORD-0001' } });

  // FIXTURE: These amounts assume tax_rate = 0.15 from Settings above.
  // Arrachera x2 = 285*2=570, Horchata x1 = 55 → subtotal=625, tax=93.75, total=718.75
  const SEED_TAX_RATE = parseFloat(DEMO_TAX_RATE);

  if (!existingOrder && mesa3 && arrachera && horchata) {
    const subtotal = Number(arrachera.price) * 2 + Number(horchata.price);
    const tax = +(subtotal * SEED_TAX_RATE).toFixed(2);
    const total = +(subtotal + tax).toFixed(2);

    await tenantDb.order.create({
      data: {
        folio: 'ORD-0001',
        tableId: mesa3.id,
        userId: mesero.id,
        type: 'DINE_IN',
        status: 'IN_PROGRESS',
        subtotal,
        tax,
        total,
        orderItems: {
          create: [
            {
              menuItemId: arrachera.id,
              quantity: 2,
              unitPrice: arrachera.price,
              subtotal: Number(arrachera.price) * 2,
            },
            {
              menuItemId: horchata.id,
              quantity: 1,
              unitPrice: horchata.price,
              subtotal: Number(horchata.price),
            },
          ],
        },
        kitchenTicket: {
          create: { status: 'IN_PROGRESS', priority: 1 },
        },
      },
    });
    console.log(`✅  Orden:    ORD-0001 (Mesa 3, ${total} MXN)`);
  } else {
    console.log(`⏭️   Orden:    ORD-0001 ya existe, se omitió`);
  }

  // ── 7. Órdenes de demo para reportes ──────────────────────────────────────
  // 18 órdenes PAID (+ su Payment COMPLETED) para que /admin/reports tenga
  // datos realistas: últimos 7 días (period=weekly), resto del mes actual
  // (period=monthly) y meses anteriores del año (period=yearly / contraste
  // mensual). Todas las fechas son relativas a "hoy" al momento de correr el
  // seed, para seguir siendo válidas sin importar cuándo se ejecute.
  const polloMole = await tenantDb.menuItem.findFirst({ where: { name: 'Pollo en Mole Negro' } });
  const flan = await tenantDb.menuItem.findFirst({ where: { name: 'Flan Napolitano' } });
  const guacamole = await tenantDb.menuItem.findFirst({ where: { name: 'Guacamole con Totopos' } });
  const demoTables = await tenantDb.restaurantTable.findMany({
    where: { branchId: branch.id },
    orderBy: { number: 'asc' },
  });

  if (arrachera && horchata && polloMole && flan && guacamole && demoTables.length > 0) {
    const now = new Date();

    // Clona `now`, resta N días, fija hora/minuto en hora local del servidor.
    const dateAt = (daysAgo: number, hour: number, minute: number): Date => {
      const d = new Date(now);
      d.setDate(d.getDate() - daysAgo);
      d.setHours(hour, minute, 0, 0);
      return d;
    };

    // Grupo B ("resto del mes actual, antes de los últimos 7 días") se
    // calcula entre el día 1 del mes y hoy-7d, para no depender de en qué
    // día del mes se corra el seed. Si esa ventana colapsa (seed corrido en
    // los primeros días del mes, donde hoy-7d cae en el mes anterior), se
    // clampa al día 1 — sigue siendo válido, solo pierde dispersión visual.
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const groupBEnd = weekAgo.getTime() > startOfMonth.getTime() ? weekAgo : startOfMonth;
    const groupBSpanMs = groupBEnd.getTime() - startOfMonth.getTime();

    const atGroupBFraction = (fraction: number, hour: number, minute: number): Date => {
      const d = new Date(startOfMonth.getTime() + groupBSpanMs * fraction);
      d.setHours(hour, minute, 0, 0);
      return d;
    };

    const demoOrders = [
      // ── Grupo A: últimos 7 días (period=weekly) ──
      { folio: 'ORD-0002', createdAt: dateAt(0, 13, 20), items: [{ menuItem: arrachera, quantity: 2 }, { menuItem: horchata, quantity: 2 }] },
      { folio: 'ORD-0003', createdAt: dateAt(0, 20, 45), items: [{ menuItem: polloMole, quantity: 1 }, { menuItem: horchata, quantity: 1 }] },
      { folio: 'ORD-0004', createdAt: dateAt(1, 14, 10), items: [{ menuItem: arrachera, quantity: 1 }, { menuItem: flan, quantity: 1 }] },
      { folio: 'ORD-0005', createdAt: dateAt(2, 21, 0), items: [{ menuItem: arrachera, quantity: 2 }, { menuItem: polloMole, quantity: 1 }] },
      // Tarde en la noche — para demostrar el fix de endDate con startDate/endDate explícitos
      { folio: 'ORD-0006', createdAt: dateAt(3, 23, 40), items: [{ menuItem: arrachera, quantity: 1 }, { menuItem: flan, quantity: 1 }] },
      { folio: 'ORD-0007', createdAt: dateAt(4, 13, 50), items: [{ menuItem: polloMole, quantity: 2 }, { menuItem: horchata, quantity: 1 }] },
      { folio: 'ORD-0008', createdAt: dateAt(6, 19, 30), items: [{ menuItem: arrachera, quantity: 1 }, { menuItem: horchata, quantity: 2 }] },

      // ── Grupo B: resto del mes actual (period=monthly) ──
      { folio: 'ORD-0009', createdAt: atGroupBFraction(0.1, 13, 30), items: [{ menuItem: polloMole, quantity: 2 }, { menuItem: arrachera, quantity: 1 }] },
      { folio: 'ORD-0010', createdAt: atGroupBFraction(0.3, 20, 15), items: [{ menuItem: arrachera, quantity: 2 }, { menuItem: horchata, quantity: 1 }] },
      { folio: 'ORD-0011', createdAt: atGroupBFraction(0.5, 14, 20), items: [{ menuItem: guacamole, quantity: 1 }, { menuItem: arrachera, quantity: 1 }] },
      { folio: 'ORD-0012', createdAt: atGroupBFraction(0.7, 19, 50), items: [{ menuItem: flan, quantity: 1 }, { menuItem: polloMole, quantity: 1 }] },
      { folio: 'ORD-0013', createdAt: atGroupBFraction(0.9, 13, 0), items: [{ menuItem: arrachera, quantity: 1 }, { menuItem: horchata, quantity: 2 }] },

      // ── Grupo C: meses anteriores del año (period=yearly / contraste mensual) ──
      { folio: 'ORD-0014', createdAt: dateAt(45, 13, 15), items: [{ menuItem: arrachera, quantity: 2 }, { menuItem: horchata, quantity: 1 }] },
      { folio: 'ORD-0015', createdAt: dateAt(70, 20, 30), items: [{ menuItem: polloMole, quantity: 1 }, { menuItem: flan, quantity: 1 }] },
      { folio: 'ORD-0016', createdAt: dateAt(95, 13, 45), items: [{ menuItem: arrachera, quantity: 1 }, { menuItem: guacamole, quantity: 1 }] },
      { folio: 'ORD-0017', createdAt: dateAt(120, 21, 10), items: [{ menuItem: horchata, quantity: 2 }, { menuItem: polloMole, quantity: 2 }] },
      { folio: 'ORD-0018', createdAt: dateAt(150, 14, 0), items: [{ menuItem: arrachera, quantity: 2 }, { menuItem: flan, quantity: 1 }] },
      { folio: 'ORD-0019', createdAt: dateAt(180, 20, 0), items: [{ menuItem: polloMole, quantity: 1 }, { menuItem: arrachera, quantity: 1 }, { menuItem: horchata, quantity: 1 }] },
    ];

    const paymentMethods = ['CASH', 'CARD', 'TRANSFER'] as const;
    let createdCount = 0;

    for (let i = 0; i < demoOrders.length; i++) {
      const spec = demoOrders[i];
      const existingDemoOrder = await tenantDb.order.findUnique({ where: { folio: spec.folio } });
      if (existingDemoOrder) continue;

      const subtotal = spec.items.reduce(
        (sum, it) => sum + Number(it.menuItem.price) * it.quantity,
        0,
      );
      const tax = +(subtotal * SEED_TAX_RATE).toFixed(2);
      const total = +(subtotal + tax).toFixed(2);
      const table = demoTables[i % demoTables.length];

      await tenantDb.order.create({
        data: {
          folio: spec.folio,
          tableId: table.id,
          userId: mesero.id,
          type: 'DINE_IN',
          status: 'PAID',
          subtotal,
          tax,
          total,
          createdAt: spec.createdAt,
          orderItems: {
            create: spec.items.map((it) => ({
              menuItemId: it.menuItem.id,
              quantity: it.quantity,
              unitPrice: it.menuItem.price,
              subtotal: Number(it.menuItem.price) * it.quantity,
            })),
          },
          payments: {
            create: {
              amount: total,
              method: paymentMethods[i % paymentMethods.length],
              status: 'COMPLETED',
              processedAt: spec.createdAt,
              createdAt: spec.createdAt,
            },
          },
        },
      });
      createdCount++;
    }

    console.log(
      `✅  Órdenes demo: ${createdCount} nuevas creadas (${demoOrders.length - createdCount} ya existían)`,
    );
  } else {
    console.log('⏭️   Órdenes demo: se omitieron (faltan platillos o mesas base)');
  }

  // ─── Resumen de credenciales ──────────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║              CREDENCIALES DE PRUEBA                          ║
╠══════════════════════════════════════════════════════════════╣
║  Header requerido:  x-tenant-slug: demo                      ║
╠══════════════════════════════════════════════════════════════╣
║  OWNER    owner@demo.com    / Owner123                       ║
║  ADMIN    admin@demo.com    / Admin123                       ║
║  WAITER   mesero@demo.com   / Mesero123                      ║
║  CASHIER  cajero@demo.com   / Cajero123                      ║
║  CHEF     chef@demo.com     / Chef1234                       ║
╚══════════════════════════════════════════════════════════════╝

  Login:  POST http://localhost:4000/api/v1/auth/login
  Docs:   http://localhost:4000/api/docs
`);
}

main()
  .catch((e) => {
    console.error('❌  Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await systemDb.$disconnect();
    await tenantDb.$disconnect();
  });
