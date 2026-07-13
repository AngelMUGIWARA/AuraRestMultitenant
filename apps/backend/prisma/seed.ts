/**
 * Seed de desarrollo — AuraRest Multitenant
 *
 * Crea un tenant de prueba y pobla su schema con:
 *  - 1 tenant (public.tenants)
 *  - 3 usuarios (owner, mesero, cajero)
 *  - 4 categorías + 12 platillos
 *  - 6 mesas
 *  - 1 orden de ejemplo con 2 items
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

  const waiterRole = await tenantDb.role.findUnique({ where: { name: 'WAITER' } });
  if (waiterRole) {
    await tenantDb.userBranch.upsert({
      where: { userId_branchId: { userId: users[2].id, branchId: branch.id } },
      update: {},
      create: { userId: users[2].id, branchId: branch.id, roleId: waiterRole.id },
    });
  }


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

  if (!existingOrder && mesa3 && arrachera && horchata) {
    const subtotal = Number(arrachera.price) * 2 + Number(horchata.price);
    const tax = +(subtotal * 0.16).toFixed(2);
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
