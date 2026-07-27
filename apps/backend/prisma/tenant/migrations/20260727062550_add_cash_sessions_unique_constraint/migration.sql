/*
  Warnings:

  - A unique constraint covering the columns `[register_id,status]` on the table `cash_sessions` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "tips" DROP CONSTRAINT "tips_payment_id_fkey";

-- DropIndex
DROP INDEX "orders_payment_status_idx";

-- AlterTable
ALTER TABLE "discounts" ADD COLUMN     "branch_id" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "ends_at" TIMESTAMP(3),
ADD COLUMN     "starts_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "image_public_id" TEXT;

-- AlterTable
ALTER TABLE "tips" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "cash_sessions_register_id_status_key" ON "cash_sessions"("register_id", "status");

-- CreateIndex
CREATE INDEX "discounts_branch_id_idx" ON "discounts"("branch_id");

-- CreateIndex
CREATE INDEX "receipts_order_id_idx" ON "receipts"("order_id");

-- RenameForeignKey
ALTER TABLE "order_items" RENAME CONSTRAINT "fk_order_items_promotion" TO "order_items_promotion_id_fkey";

-- RenameForeignKey
ALTER TABLE "order_promotions" RENAME CONSTRAINT "fk_order_promotions_order" TO "order_promotions_order_id_fkey";

-- RenameForeignKey
ALTER TABLE "order_promotions" RENAME CONSTRAINT "fk_order_promotions_promotion" TO "order_promotions_promotion_id_fkey";

-- RenameForeignKey
ALTER TABLE "promotion_categories" RENAME CONSTRAINT "fk_promotion_categories_category" TO "promotion_categories_category_id_fkey";

-- RenameForeignKey
ALTER TABLE "promotion_categories" RENAME CONSTRAINT "fk_promotion_categories_promotion" TO "promotion_categories_promotion_id_fkey";

-- RenameForeignKey
ALTER TABLE "promotion_items" RENAME CONSTRAINT "fk_promotion_items_menu_item" TO "promotion_items_menu_item_id_fkey";

-- RenameForeignKey
ALTER TABLE "promotion_items" RENAME CONSTRAINT "fk_promotion_items_promotion" TO "promotion_items_promotion_id_fkey";

-- RenameForeignKey
ALTER TABLE "promotions" RENAME CONSTRAINT "fk_promotions_branch" TO "promotions_branch_id_fkey";

-- AddForeignKey
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tips" ADD CONSTRAINT "tips_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_order_items_promotion_id" RENAME TO "order_items_promotion_id_idx";

-- RenameIndex
ALTER INDEX "idx_order_promotions_order_id" RENAME TO "order_promotions_order_id_idx";

-- RenameIndex
ALTER INDEX "idx_order_promotions_promotion_id" RENAME TO "order_promotions_promotion_id_idx";

-- RenameIndex
ALTER INDEX "idx_promotion_categories_category_id" RENAME TO "promotion_categories_category_id_idx";

-- RenameIndex
ALTER INDEX "idx_promotion_items_menu_item_id" RENAME TO "promotion_items_menu_item_id_idx";

-- RenameIndex
ALTER INDEX "idx_promotions_branch_id" RENAME TO "promotions_branch_id_idx";

-- RenameIndex
ALTER INDEX "reservations_branch_status_scheduled_idx" RENAME TO "reservations_branch_id_status_scheduled_at_idx";

-- RenameIndex
ALTER INDEX "reservations_branch_table_scheduled_idx" RENAME TO "reservations_branch_id_table_id_scheduled_at_idx";
