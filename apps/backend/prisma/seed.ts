/**
 * Seed de desarrollo — AuraRest Multitenant
 *
 * Crea un tenant de prueba y pobla su schema con:
 *  - 1 tenant (public.tenants)
 *  - 6 usuarios (owner x2, gerente, mesero, cajero, kitchen staff)
 *  - 4 categorías + 12 platillos
 *  - 6 mesas
 *  - 1 orden de ejemplo con 2 items (IN_PROGRESS)
 *  - 18 órdenes PAID de demo para reportes (ventas/productos/pagos/horarios
 *    pico), repartidas en los últimos 7 días, el resto del mes actual y
 *    meses anteriores del año — todas con fechas relativas a "hoy" para
 *    seguir siendo válidas sin importar cuándo se corra el seed.
 *  - Inventario: 3 proveedores, 15 insumos, stock en sucursal central,
 *    movimientos de compra/consumo/merma/ajuste (auditados por owner y
 *    kitchen staff) y recetas platillo→insumo.
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

  // ── 1.b Limpieza de usuario legacy admin@demo.com ────────────────────────
  // Seed.js y seed-cashier-orders-payments.js (ahora eliminados) creaban
  // admin@demo.com con roles ADMIN/OWNER que ya no existen. Este bloque
  // elimina ese registro si aún persiste en la BD y reasigna sus
  // relaciones (inventory movements, user_branches) al owner válido.
  const legacyUser = await tenantDb.user.findUnique({
    where: { email: 'admin@demo.com' },
  });
  if (legacyUser) {
    const ownerUser = await tenantDb.user.findUnique({
      where: { email: 'owner@demo.com' },
    });
    if (ownerUser) {
      // Reasignar movimientos de inventario creados por el usuario legacy
      await tenantDb.inventoryMovement.updateMany({
        where: { createdBy: legacyUser.id },
        data: { createdBy: ownerUser.id },
      });
      console.log('🔄  Movimientos de inventario de admin@demo.com reasignados a owner@demo.com');
    }
    // Eliminar asignaciones de sucursal (user_branches) antes de borrar el usuario
    await tenantDb.userBranch.deleteMany({
      where: { userId: legacyUser.id },
    });
    // Eliminar el usuario legacy
    await tenantDb.user.delete({
      where: { email: 'admin@demo.com' },
    });
    console.log('🗑️   Usuario legacy admin@demo.com eliminado de la BD');
  }

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
        // El rol CHEF se retiró y se fusionó en KITCHEN_STAFF (ya existía
        // en el enum) — se conserva el email/password de siempre.
        name: 'Marco Cocina',
        email: 'chef@demo.com',
        passwordHash: await hash('Chef1234'),
        role: 'KITCHEN_STAFF',
        status: 'ACTIVE',
      },
    }),
    tenantDb.user.upsert({
      where: { email: 'gerente@demo.com' },
      update: {},
      create: {
        name: 'Sofía Gerente',
        email: 'gerente@demo.com',
        passwordHash: await hash('Gerente123'),
        role: 'MANAGER',
        status: 'ACTIVE',
        phone: '+52 55 1111 0003',
      },
    }),
  ]);
  console.log(`✅  Usuarios:  ${users.map((u) => u.role).join(', ')}`);

  // ── 2.b Roles y Branch para pruebas ──────────────────────────────────────
  const roles = await tenantDb.role.findMany();
  if (roles.length === 0) {
    await Promise.all([
      tenantDb.role.create({ data: { name: 'OWNER' } }),
      tenantDb.role.create({ data: { name: 'MANAGER' } }),
      tenantDb.role.create({ data: { name: 'WAITER' } }),
      tenantDb.role.create({ data: { name: 'CASHIER' } }),
      tenantDb.role.create({ data: { name: 'KITCHEN_STAFF' } }),
    ]);
    console.log('✅  Roles: OWNER, MANAGER, WAITER, CASHIER, KITCHEN_STAFF');
  }

  const branch = await tenantDb.branch.upsert({
    where: { slug: 'central' },
    update: {},
    create: { name: 'Sucursal Central', slug: 'central', address: 'Centro', phone: '+52 55 0000 0002' },
  });

  // Asignar user a la branch con roles
  // (users[0] = Carlos owner@demo.com)
  const ownerRole = await tenantDb.role.findUnique({ where: { name: 'OWNER' } });

  if (ownerRole) {
    await tenantDb.userBranch.upsert({
      where: { userId_branchId: { userId: users[0].id, branchId: branch.id } },
      update: {},
      create: { userId: users[0].id, branchId: branch.id, roleId: ownerRole.id },
    });
  }

  // Gerente y kitchen staff asignados a la sucursal central — el módulo de
  // inventario usa UserBranch para limitar a MANAGER/KITCHEN_STAFF a sus
  // sucursales autorizadas
  const managerRole = await tenantDb.role.findUnique({ where: { name: 'MANAGER' } });
  const kitchenStaffRole = await tenantDb.role.findUnique({ where: { name: 'KITCHEN_STAFF' } });
  const gerente = users.find((u) => u.role === 'MANAGER')!;
  const chefUser = users.find((u) => u.email === 'chef@demo.com')!;

  if (managerRole) {
    await tenantDb.userBranch.upsert({
      where: { userId_branchId: { userId: gerente.id, branchId: branch.id } },
      update: {},
      create: { userId: gerente.id, branchId: branch.id, roleId: managerRole.id },
    });
  }

  if (kitchenStaffRole) {
    await tenantDb.userBranch.upsert({
      where: { userId_branchId: { userId: chefUser.id, branchId: branch.id } },
      update: {},
      create: { userId: chefUser.id, branchId: branch.id, roleId: kitchenStaffRole.id },
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
        branchId: branch.id,
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
          create: { status: 'PREPARING', priority: 'NORMAL' },
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
          branchId: table.branchId,
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

  // ── 8. Inventario ─────────────────────────────────────────────────────────
  // Proveedores, insumos, stock por sucursal, movimientos auditados por
  // usuario (owner/kitchen staff) y recetas que vinculan platillos con
  // insumos.
  const owner = users.find((u) => u.email === 'owner@demo.com')!;
  const chef = users.find((u) => u.email === 'chef@demo.com')!;

  // 8.a Proveedores
  const [provCarnes, provAbarrotes, provBebidas] = await Promise.all([
    tenantDb.supplier.upsert({
      where: { name: 'Carnes del Norte' },
      update: {},
      create: {
        name: 'Carnes del Norte',
        contactName: 'Raúl Treviño',
        email: 'ventas@carnesdelnorte.mx',
        phone: '+52 81 2222 0001',
        address: 'Mercado de Abastos, Local 12',
      },
    }),
    tenantDb.supplier.upsert({
      where: { name: 'Abarrotes La Central' },
      update: {},
      create: {
        name: 'Abarrotes La Central',
        contactName: 'María Gómez',
        email: 'pedidos@lacentral.mx',
        phone: '+52 55 3333 0002',
        address: 'Central de Abasto, Nave 4',
      },
    }),
    tenantDb.supplier.upsert({
      where: { name: 'Bebidas y Más' },
      update: {},
      create: {
        name: 'Bebidas y Más',
        contactName: 'Jorge Salinas',
        email: 'contacto@bebidasymas.mx',
        phone: '+52 55 4444 0003',
        address: 'Av. Industrial 45',
      },
    }),
  ]);
  console.log('✅  Proveedores: Carnes del Norte, Abarrotes La Central, Bebidas y Más');

  // 8.b Insumos — initialStock alimenta la compra inicial (movimiento PURCHASE)
  const inventorySpecs = [
    { name: 'Arrachera',        sku: 'CAR-001', unit: 'KG',      costPerUnit: 220, minStock: 10, initialStock: 25,  supplierId: provCarnes.id },
    { name: 'Pechuga de Pollo', sku: 'CAR-002', unit: 'KG',      costPerUnit: 95,  minStock: 8,  initialStock: 20,  supplierId: provCarnes.id },
    { name: 'Huachinango',      sku: 'CAR-003', unit: 'KG',      costPerUnit: 185, minStock: 5,  initialStock: 12,  supplierId: provCarnes.id },
    { name: 'Chorizo',          sku: 'CAR-004', unit: 'KG',      costPerUnit: 120, minStock: 3,  initialStock: 6,   supplierId: provCarnes.id },
    { name: 'Aguacate Hass',    sku: 'ABA-001', unit: 'KG',      costPerUnit: 65,  minStock: 6,  initialStock: 15,  supplierId: provAbarrotes.id },
    { name: 'Queso Chihuahua',  sku: 'ABA-002', unit: 'KG',      costPerUnit: 145, minStock: 4,  initialStock: 10,  supplierId: provAbarrotes.id },
    { name: 'Mole Negro',       sku: 'ABA-003', unit: 'KG',      costPerUnit: 160, minStock: 3,  initialStock: 8,   supplierId: provAbarrotes.id },
    { name: 'Limón',            sku: 'ABA-004', unit: 'KG',      costPerUnit: 42,  minStock: 5,  initialStock: 10,  supplierId: provAbarrotes.id },
    { name: 'Totopos',          sku: 'ABA-005', unit: 'PACKAGE', costPerUnit: 28,  minStock: 10, initialStock: 30,  supplierId: provAbarrotes.id },
    { name: 'Café de Grano',    sku: 'ABA-006', unit: 'KG',      costPerUnit: 260, minStock: 2,  initialStock: 5,   supplierId: provAbarrotes.id },
    { name: 'Piloncillo',       sku: 'ABA-007', unit: 'KG',      costPerUnit: 38,  minStock: 2,  initialStock: 4,   supplierId: provAbarrotes.id },
    { name: 'Huevo',            sku: 'ABA-008', unit: 'PIECE',   costPerUnit: 4,   minStock: 60, initialStock: 180, supplierId: provAbarrotes.id },
    { name: 'Leche Entera',     sku: 'BEB-001', unit: 'L',       costPerUnit: 26,  minStock: 10, initialStock: 24,  supplierId: provBebidas.id },
    { name: 'Agua Mineral',     sku: 'BEB-002', unit: 'BOX',     costPerUnit: 130, minStock: 3,  initialStock: 8,   supplierId: provBebidas.id },
    { name: 'Arroz',            sku: 'ABA-009', unit: 'KG',      costPerUnit: 32,  minStock: 8,  initialStock: 20,  supplierId: provAbarrotes.id },
  ] as const;

  const inventoryItems = new Map<string, { id: string }>();
  for (const spec of inventorySpecs) {
    const item = await tenantDb.inventoryItem.upsert({
      where: { name: spec.name },
      update: {},
      create: {
        name: spec.name,
        sku: spec.sku,
        unit: spec.unit,
        costPerUnit: spec.costPerUnit,
        minStock: spec.minStock,
        supplierId: spec.supplierId,
      },
    });
    inventoryItems.set(spec.name, item);
  }
  console.log(`✅  Insumos:   ${inventorySpecs.length} items de inventario`);

  // 8.c Movimientos — solo en la primera corrida para no duplicar el kardex
  const existingMovements = await tenantDb.inventoryMovement.count();
  if (existingMovements === 0) {
    // Compra inicial registrada por Laura (owner)
    for (const spec of inventorySpecs) {
      const item = inventoryItems.get(spec.name)!;
      await tenantDb.inventoryMovement.create({
        data: {
          itemId: item.id,
          branchId: branch.id,
          type: 'PURCHASE',
          quantity: spec.initialStock,
          unitCost: spec.costPerUnit,
          totalCost: +(spec.initialStock * spec.costPerUnit).toFixed(2),
          reason: 'Compra inicial de apertura',
          reference: 'FAC-2026-001',
          supplierId: spec.supplierId,
          createdBy: owner.id,
        },
      });
    }

    // Consumos del servicio registrados por Marco (kitchen staff)
    const consumptions = [
      { name: 'Arrachera', quantity: 4.5, reference: 'ORD-0001' },
      { name: 'Mole Negro', quantity: 1.2, reference: 'ORD-0003' },
      { name: 'Aguacate Hass', quantity: 2.0, reference: 'ORD-0011' },
      { name: 'Huevo', quantity: 36, reference: 'ORD-0004' },
      { name: 'Leche Entera', quantity: 4.0, reference: 'ORD-0004' },
    ];
    for (const c of consumptions) {
      const item = inventoryItems.get(c.name)!;
      await tenantDb.inventoryMovement.create({
        data: {
          itemId: item.id,
          branchId: branch.id,
          type: 'CONSUMPTION',
          quantity: c.quantity,
          reason: 'Consumo de servicio',
          reference: c.reference,
          createdBy: chef.id,
        },
      });
    }

    // Merma registrada por el kitchen staff
    await tenantDb.inventoryMovement.create({
      data: {
        itemId: inventoryItems.get('Huachinango')!.id,
        branchId: branch.id,
        type: 'WASTE',
        quantity: 1.5,
        reason: 'Producto en mal estado al recibir',
        createdBy: chef.id,
      },
    });

    // Ajuste por conteo físico registrado por el OWNER (Carlos)
    await tenantDb.inventoryMovement.create({
      data: {
        itemId: inventoryItems.get('Totopos')!.id,
        branchId: branch.id,
        type: 'ADJUSTMENT',
        quantity: 2,
        reason: 'Diferencia en conteo físico semanal',
        createdBy: owner.id,
      },
    });

    console.log(`✅  Movimientos: ${inventorySpecs.length} compras + 5 consumos + 1 merma + 1 ajuste`);
  } else {
    console.log('⏭️   Movimientos: ya existen, se omitieron');
  }

  // 8.d Stock por sucursal — cantidad final coherente con el kardex anterior.
  // "Huachinango" y "Café de Grano" quedan cerca/debajo de minStock para
  // demostrar alertas de reabastecimiento en las vistas.
  const stockDeltas: Record<string, number> = {
    Arrachera: -4.5,
    'Mole Negro': -1.2,
    'Aguacate Hass': -2.0,
    Huevo: -36,
    'Leche Entera': -4.0,
    Huachinango: -8.5, // 1.5 de merma + consumo acumulado → queda bajo minStock
    'Café de Grano': -3.5, // queda bajo minStock
    Totopos: -2,
  };
  for (const spec of inventorySpecs) {
    const item = inventoryItems.get(spec.name)!;
    const quantity = +(spec.initialStock + (stockDeltas[spec.name] ?? 0)).toFixed(3);
    await tenantDb.inventoryStock.upsert({
      where: { itemId_branchId: { itemId: item.id, branchId: branch.id } },
      update: {},
      create: { itemId: item.id, branchId: branch.id, quantity },
    });
  }
  console.log(`✅  Stock:     ${inventorySpecs.length} items en sucursal ${branch.slug} (2 bajo mínimo)`);

  // 8.e Recetas — vinculan platillos del menú con insumos (visibilidad KITCHEN_STAFF)
  const recipes: Array<{ dish: string; ingredients: Array<{ item: string; quantity: number; notes?: string }> }> = [
    {
      dish: 'Arrachera a las Brasas',
      ingredients: [
        { item: 'Arrachera', quantity: 0.3, notes: '300g por porción' },
        { item: 'Limón', quantity: 0.05 },
      ],
    },
    {
      dish: 'Pollo en Mole Negro',
      ingredients: [
        { item: 'Pechuga de Pollo', quantity: 0.25 },
        { item: 'Mole Negro', quantity: 0.1 },
        { item: 'Arroz', quantity: 0.08 },
      ],
    },
    {
      dish: 'Pescado a la Veracruzana',
      ingredients: [
        { item: 'Huachinango', quantity: 0.25 },
        { item: 'Limón', quantity: 0.03 },
      ],
    },
    {
      dish: 'Guacamole con Totopos',
      ingredients: [
        { item: 'Aguacate Hass', quantity: 0.2 },
        { item: 'Limón', quantity: 0.03 },
        { item: 'Totopos', quantity: 1, notes: '1 paquete por orden' },
      ],
    },
    {
      dish: 'Queso Fundido',
      ingredients: [
        { item: 'Queso Chihuahua', quantity: 0.15 },
        { item: 'Chorizo', quantity: 0.08 },
      ],
    },
    {
      dish: 'Café de Olla',
      ingredients: [
        { item: 'Café de Grano', quantity: 0.02 },
        { item: 'Piloncillo', quantity: 0.03 },
      ],
    },
    {
      dish: 'Flan Napolitano',
      ingredients: [
        { item: 'Huevo', quantity: 3 },
        { item: 'Leche Entera', quantity: 0.2 },
      ],
    },
  ];

  let recipeLinks = 0;
  for (const recipe of recipes) {
    const dish = await tenantDb.menuItem.findFirst({ where: { name: recipe.dish } });
    if (!dish) continue;
    for (const ing of recipe.ingredients) {
      const item = inventoryItems.get(ing.item);
      if (!item) continue;
      await tenantDb.recipeIngredient.upsert({
        where: { menuItemId_inventoryItemId: { menuItemId: dish.id, inventoryItemId: item.id } },
        update: {},
        create: {
          menuItemId: dish.id,
          inventoryItemId: item.id,
          quantity: ing.quantity,
          notes: ing.notes,
        },
      });
      recipeLinks++;
    }
  }
  console.log(`✅  Recetas:   ${recipes.length} platillos con ${recipeLinks} ingredientes vinculados`);

  // ─── Resumen de credenciales ──────────────────────────────────────────────
  console.log(`
╔═══════════════════════════════════════════════╗
║              CREDENCIALES DE PRUEBA           ║
╠═══════════════════════════════════════════════╣
║  Header requerido:  x-tenant-slug: demo       ║
╠═══════════════════════════════════════════════╣
║  OWNER          owner@demo.com    / Owner123  ║
║  MANAGER        gerente@demo.com  / Gerente123║
║  WAITER         mesero@demo.com   / Mesero123 ║
║  CASHIER        cajero@demo.com   / Cajero123 ║
║  KITCHEN_STAFF  chef@demo.com     / Chef1234  ║
╚═══════════════════════════════════════════════╝

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
