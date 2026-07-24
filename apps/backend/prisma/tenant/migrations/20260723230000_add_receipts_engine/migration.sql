-- CreateTable
CREATE TABLE "receipts" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "branch_id" TEXT,
    "user_id" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "promotion_amount" DECIMAL(12,2) NOT NULL,
    "discount_amount" DECIMAL(12,2) NOT NULL,
    "tax_amount" DECIMAL(12,2) NOT NULL,
    "tip_amount" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_sequences" (
    "id" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipt_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "receipts_order_id_key" ON "receipts"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_folio_key" ON "receipts"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_idempotency_key_key" ON "receipts"("idempotency_key");

-- CreateIndex
CREATE INDEX "receipts_branch_id_idx" ON "receipts"("branch_id");

-- CreateIndex
CREATE INDEX "receipts_issued_at_idx" ON "receipts"("issued_at");

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
