-- AlterTable Order
ALTER TABLE "orders" ADD COLUMN "tip_amount" DECIMAL(10,2);
ALTER TABLE "orders" ADD COLUMN "cash_tip_amount" DECIMAL(10,2);
ALTER TABLE "orders" ADD COLUMN "chargeable_tip_amount" DECIMAL(10,2);
ALTER TABLE "orders" ADD COLUMN "total_before_tip" DECIMAL(10,2);
ALTER TABLE "orders" ADD COLUMN "amount_due_for_payments" DECIMAL(10,2);

-- Update existing orders to have compatible backfill for tips
UPDATE "orders" SET 
    "tip_amount" = 0,
    "cash_tip_amount" = 0,
    "chargeable_tip_amount" = 0,
    "total_before_tip" = "total",
    "amount_due_for_payments" = "total";

-- AlterTable Tips
ALTER TABLE "tips" ADD COLUMN "order_id" TEXT;
ALTER TABLE "tips" ADD COLUMN "percentage" DECIMAL(10,2);
ALTER TABLE "tips" ADD COLUMN "requested_amount" DECIMAL(10,2);
ALTER TABLE "tips" ADD COLUMN "tip_amount" DECIMAL(10,2);
ALTER TABLE "tips" ADD COLUMN "cash_tip_amount" DECIMAL(10,2);
ALTER TABLE "tips" ADD COLUMN "chargeable_tip_amount" DECIMAL(10,2);
ALTER TABLE "tips" ADD COLUMN "base_amount" DECIMAL(10,2);
ALTER TABLE "tips" ADD COLUMN "created_by" TEXT;
ALTER TABLE "tips" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Make payment_id optional in Tip (it was NOT NULL)
ALTER TABLE "tips" ALTER COLUMN "payment_id" DROP NOT NULL;

-- Backfill Tips
UPDATE "tips" SET 
    "tip_amount" = "amount",
    "cash_tip_amount" = 0,
    "chargeable_tip_amount" = "amount",
    "base_amount" = 0;

-- Add Constraints and Indexes
ALTER TABLE "tips" ADD CONSTRAINT "tips_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tips" ADD CONSTRAINT "tips_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "tips_order_id_key" ON "tips"("order_id");

-- Check Constraints
ALTER TABLE "tips" ADD CONSTRAINT "tips_tip_amount_check" CHECK ("tip_amount" >= 0);
ALTER TABLE "tips" ADD CONSTRAINT "tips_cash_tip_amount_check" CHECK ("cash_tip_amount" >= 0);
ALTER TABLE "tips" ADD CONSTRAINT "tips_chargeable_tip_amount_check" CHECK ("chargeable_tip_amount" >= 0);
ALTER TABLE "tips" ADD CONSTRAINT "tips_base_amount_check" CHECK ("base_amount" >= 0);
ALTER TABLE "tips" ADD CONSTRAINT "tips_requested_amount_check" CHECK ("requested_amount" IS NULL OR "requested_amount" >= 0);
ALTER TABLE "tips" ADD CONSTRAINT "tips_percentage_check" CHECK ("percentage" IS NULL OR ("percentage" >= 0 AND "percentage" <= 100));
ALTER TABLE "tips" ADD CONSTRAINT "tips_sum_check" CHECK ("tip_amount" = "cash_tip_amount" + "chargeable_tip_amount");

-- TipMethod specific constraints
ALTER TABLE "tips" ADD CONSTRAINT "tips_method_consistency" CHECK (
  ("method" = 'NONE'
    AND "tip_amount" = 0
    AND "cash_tip_amount" = 0
    AND "chargeable_tip_amount" = 0)
  OR
  ("method" = 'PERCENTAGE'
    AND "percentage" IS NOT NULL)
  OR
  ("method" = 'FIXED'
    AND "requested_amount" IS NOT NULL)
  OR
  ("method" = 'CASH'
    AND "requested_amount" IS NOT NULL
    AND "cash_tip_amount" = "tip_amount"
    AND "chargeable_tip_amount" = 0)
);
