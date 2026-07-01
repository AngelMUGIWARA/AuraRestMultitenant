/*
  Warnings:

  - A unique constraint covering the columns `[number,branch_id]` on the table `tables` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `branch_id` to the `tables` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "tables_number_key";

-- AlterTable
ALTER TABLE "tables" ADD COLUMN     "branch_id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "tables_branch_id_idx" ON "tables"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "tables_number_branch_id_key" ON "tables"("number", "branch_id");
