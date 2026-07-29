-- Retira los roles ADMIN y CHEF del modelo (ver ANALISIS_ROLES_Y_TENANTS.md).
-- ADMIN se fusiona en OWNER (tenía los mismos permisos en casi todos los
-- endpoints). CHEF se fusiona en KITCHEN_STAFF, que ya existía en el enum.
--
-- Este archivo se replay-ea statement por statement tanto por
-- `prisma migrate` como por TenantProvisioningService.applyTenantMigrations
-- (que solo soporta sentencias planas separadas por ";", sin bloques DO/$$),
-- así que todo aquí debe ser SQL secuencial simple.

-- 1. Reasignar usuarios existentes ANTES de tocar el tipo enum.
UPDATE "users" SET "role" = 'OWNER' WHERE "role" = 'ADMIN';
UPDATE "users" SET "role" = 'KITCHEN_STAFF' WHERE "role" = 'CHEF';

-- 2. Recrear el tipo UserRole sin ADMIN/CHEF (Postgres no soporta DROP VALUE).
ALTER TYPE "UserRole" RENAME TO "UserRole_old";

CREATE TYPE "UserRole" AS ENUM ('OWNER', 'MANAGER', 'WAITER', 'CASHIER', 'KITCHEN_STAFF');

ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole" USING ("role"::text::"UserRole");

ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'WAITER';

DROP TYPE "UserRole_old";

-- 3. Reasignar sucursales (user_branches) que referencian el catálogo
--    "roles" con name='ADMIN'/'CHEF' hacia OWNER/KITCHEN_STAFF.
UPDATE "user_branches"
SET "role_id" = (SELECT "id" FROM "roles" WHERE "name" = 'OWNER')
WHERE "role_id" = (SELECT "id" FROM "roles" WHERE "name" = 'ADMIN');

UPDATE "user_branches"
SET "role_id" = (SELECT "id" FROM "roles" WHERE "name" = 'KITCHEN_STAFF')
WHERE "role_id" = (SELECT "id" FROM "roles" WHERE "name" = 'CHEF');

-- 4. Limpiar permisos y catálogo de roles ADMIN/CHEF.
DELETE FROM "role_permissions"
WHERE "role_id" IN (SELECT "id" FROM "roles" WHERE "name" IN ('ADMIN', 'CHEF'));

DELETE FROM "roles" WHERE "name" IN ('ADMIN', 'CHEF');
