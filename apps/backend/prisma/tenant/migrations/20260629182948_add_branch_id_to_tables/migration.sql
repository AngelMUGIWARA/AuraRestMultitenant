/*
  Warnings:
  - A unique constraint covering the columns `[number,branch_id]` on the table `tables` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `branch_id` to the `tables` table without a default value. This is not possible if the table is not empty.
*/
-- DropIndex
DROP INDEX "tables_number_key";

-- AlterTable: primero nullable para poder llenar datos existentes
ALTER TABLE "tables" ADD COLUMN "branch_id" TEXT;

-- Asignar el branch existente a todas las mesas sin branch
UPDATE "tables" SET "branch_id" = (SELECT "id" FROM "branches" LIMIT 1) WHERE "branch_id" IS NULL;

-- Ahora sí hacerla NOT NULL
ALTER TABLE "tables" ALTER COLUMN "branch_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "tables_branch_id_idx" ON "tables"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "tables_number_branch_id_key" ON "tables"("number", "branch_id");