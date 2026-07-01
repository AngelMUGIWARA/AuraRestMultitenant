/*
  Warnings:

  - Added the required column `branch_id` to the `reservations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "branch_id" TEXT NOT NULL;
