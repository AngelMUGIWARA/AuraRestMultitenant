-- Add discount_amount and taxable_subtotal to orders table
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "discount_amount"   DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "taxable_subtotal"  DECIMAL(10,2);
