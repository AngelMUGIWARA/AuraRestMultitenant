/**
 * Seed del Super Admin de plataforma — AuraRest Multitenant
 *
 * Crea un único SuperAdmin de prueba en el schema `system` (tabla
 * super_admins). Independiente de prisma/seed.ts (que siembra el tenant
 * demo) — el Super Admin no pertenece a ningún tenant.
 *
 * Uso:
 *   pnpm --filter backend exec ts-node prisma/seed-system-admin.ts
 */

import * as bcrypt from 'bcrypt';
import { PrismaClient as SystemClient } from '../src/generated/prisma-system';

const BASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://postgres:root@localhost:5432/aura_rest';

const SUPER_ADMIN_EMAIL = 'superadmin@aurarest.dev';
const SUPER_ADMIN_PASSWORD = 'SuperAdmin123';
const BCRYPT_ROUNDS = 10;

const systemDb = new SystemClient({ datasources: { db: { url: BASE_URL } } });

async function main() {
  console.log('\n🌱  Sembrando Super Admin...\n');

  const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, BCRYPT_ROUNDS);

  const superAdmin = await systemDb.superAdmin.upsert({
    where: { email: SUPER_ADMIN_EMAIL },
    update: {},
    create: {
      email: SUPER_ADMIN_EMAIL,
      passwordHash,
      name: 'Super Admin',
      status: 'ACTIVE',
    },
  });

  console.log(`✅  Super Admin: ${superAdmin.email}`);
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║              CREDENCIALES DE SUPER ADMIN                     ║
╠══════════════════════════════════════════════════════════════╣
║  Email:     ${SUPER_ADMIN_EMAIL.padEnd(48)}║
║  Password:  ${SUPER_ADMIN_PASSWORD.padEnd(48)}║
╚══════════════════════════════════════════════════════════════╝

  Login:  POST http://localhost:4000/api/v1/system-admin/auth/login
`);
}

main()
  .catch((e) => {
    console.error('❌  Error en seed de Super Admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await systemDb.$disconnect();
  });
