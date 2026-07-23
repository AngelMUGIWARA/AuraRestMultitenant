-- CreateEnum
CREATE TYPE "OrderPaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID');

-- AlterTable: Add payment_status column with safe default
-- All existing orders: UNPAID is correct because:
--   - If an order has no COMPLETED payments → UNPAID
--   - If an order has COMPLETED payments → they will be reconciled below
ALTER TABLE "orders" ADD COLUMN "payment_status" "OrderPaymentStatus" NOT NULL DEFAULT 'UNPAID';

-- Backfill: Orders with COMPLETED payments should be PAID
UPDATE "orders" o
SET "payment_status" = 'PAID'
WHERE EXISTS (
  SELECT 1 FROM "payments" p
  WHERE p."order_id" = o."id"
    AND p."status" = 'COMPLETED'
);

-- Backfill: Orders with COMPLETED payments summing to less than total should be PARTIALLY_PAID
-- (This covers the rare edge case where a previous bug left partial payments)
UPDATE "orders" o
SET "payment_status" = 'PARTIALLY_PAID'
WHERE o."payment_status" = 'UNPAID'
  AND EXISTS (
    SELECT 1 FROM "payments" p
    WHERE p."order_id" = o."id"
      AND p."status" = 'COMPLETED'
  )
  AND (
    SELECT COALESCE(SUM(p."amount"), 0) FROM "payments" p
    WHERE p."order_id" = o."id"
      AND p."status" = 'COMPLETED'
  ) < o."total";

-- CreateIndex for efficient filtering by payment_status
CREATE INDEX "orders_payment_status_idx" ON "orders"("payment_status");
