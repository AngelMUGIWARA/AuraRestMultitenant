
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_system_1 = require("../src/generated/prisma-system");
const prisma_tenant_1 = require("../src/generated/prisma-tenant");
const bcrypt = __importStar(require("bcrypt"));
const BASE_URL = process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5433/aura_rest';
const TENANT_SLUG = 'demo';
const TENANT_SCHEMA = 'tenant_ejemplo';
const BCRYPT_ROUNDS = 10;
const systemDb = new prisma_system_1.PrismaClient({ datasources: { db: { url: BASE_URL } } });
const tenantUrl = BASE_URL.includes('?')
    ? `${BASE_URL}&schema=${TENANT_SCHEMA}`
    : `${BASE_URL}?schema=${TENANT_SCHEMA}`;
const tenantDb = new prisma_tenant_1.PrismaClient({ datasources: { db: { url: tenantUrl } } });
const hash = (plain) => bcrypt.hash(plain, BCRYPT_ROUNDS);
async function main() {
    console.log('\n🌱  Iniciando seed...\n');
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
    const menuItems = [
        { name: 'Sopa de Lima', description: 'Tradicional sopa yucateca con pollo', price: 85, categoryId: entradas.id },
        { name: 'Guacamole con Totopos', description: 'Aguacate Hass con chips artesanales', price: 95, categoryId: entradas.id },
        { name: 'Queso Fundido', description: 'Queso chihuahua con chorizo', price: 110, categoryId: entradas.id },
        { name: 'Arrachera a las Brasas', description: '300g de arrachera marinada con papas', price: 285, categoryId: fuertes.id },
        { name: 'Pescado a la Veracruzana', description: 'Filete de huachinango con salsa criolla', price: 245, categoryId: fuertes.id },
        { name: 'Pollo en Mole Negro', description: 'Pieza de pollo con mole de Oaxaca', price: 195, categoryId: fuertes.id },
        { name: 'Enchiladas Verdes', description: 'Tres enchiladas con pollo y crema', price: 165, categoryId: fuertes.id },
        { name: 'Agua de Horchata', description: '1L de horchata artesanal', price: 55, categoryId: bebidas.id },
        { name: 'Limonada Mineral', description: 'Con menta fresca', price: 65, categoryId: bebidas.id },
        { name: 'Café de Olla', description: 'Canela y piloncillo', price: 45, categoryId: bebidas.id },
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
            where: { number: table.number },
            update: {},
            create: { ...table, status: 'AVAILABLE', isActive: true },
        });
    }
    console.log(`✅  Mesas:    ${tables.length} mesas`);
    const mesero = users.find((u) => u.role === 'WAITER');
    const mesa3 = await tenantDb.restaurantTable.findUnique({ where: { number: 3 } });
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
    }
    else {
        console.log(`⏭️   Orden:    ORD-0001 ya existe, se omitió`);
    }
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
//# sourceMappingURL=seed.js.map