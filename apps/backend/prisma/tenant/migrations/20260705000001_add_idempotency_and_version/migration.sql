-- Add idempotency_key to payments for idempotent payment processing
ALTER TABLE "payments" ADD COLUMN "idempotency_key" TEXT;

-- Create unique index for idempotency_key (nullable, allows multiple NULLs in PG)
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");

-- Add version to orders for optimistic locking
ALTER TABLE "orders" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
