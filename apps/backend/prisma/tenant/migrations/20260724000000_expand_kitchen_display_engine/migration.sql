-- ============================================================
-- Kitchen Display Engine — migración expandiendo kitchen_tickets
-- y creando kitchen_ticket_items.
--
-- ESTRATEGIA IN_PROGRESS → PREPARING:
--   PostgreSQL no permite renombrar valores de enum directamente.
--   Se crea un enum temporal con los valores finales, se migra
--   la columna con USING, se elimina el enum viejo y se renombra.
--
-- ESTRATEGIA priority INTEGER → KitchenPriority enum:
--   priority <= -1 → LOW
--   priority = 0   → NORMAL  (default)
--   priority = 1   → HIGH
--   priority >= 2  → URGENT
-- ============================================================

-- ── 1. Crear enums nuevos ───────────────────────────────────
CREATE TYPE "KitchenItemStatus" AS ENUM ('PENDING', 'PREPARING', 'READY', 'CANCELLED');
CREATE TYPE "KitchenPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- ── 2. Migrar KitchenTicketStatus: IN_PROGRESS → PREPARING ──
CREATE TYPE "KitchenTicketStatus_new" AS ENUM ('PENDING', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED');

ALTER TABLE "kitchen_tickets"
  ALTER COLUMN "status" TYPE "KitchenTicketStatus_new"
  USING (
    CASE "status"::text
      WHEN 'IN_PROGRESS' THEN 'PREPARING'
      WHEN 'PENDING'     THEN 'PENDING'
      WHEN 'READY'       THEN 'READY'
      WHEN 'DELIVERED'   THEN 'DELIVERED'
      ELSE 'PENDING'
    END
  )::"KitchenTicketStatus_new";

DROP TYPE "KitchenTicketStatus";
ALTER TYPE "KitchenTicketStatus_new" RENAME TO "KitchenTicketStatus";

-- ── 3. Migrar priority: INTEGER → KitchenPriority enum ──────
ALTER TABLE "kitchen_tickets"
  ALTER COLUMN "priority" TYPE "KitchenPriority"
  USING (
    CASE
      WHEN "priority" <= -1 THEN 'LOW'
      WHEN "priority" =  0  THEN 'NORMAL'
      WHEN "priority" =  1  THEN 'HIGH'
      ELSE 'URGENT'
    END
  )::"KitchenPriority";

ALTER TABLE "kitchen_tickets"
  ALTER COLUMN "priority" SET DEFAULT 'NORMAL';

-- ── 4. Agregar columnas nuevas ──────────────────────────────
ALTER TABLE "kitchen_tickets"
  ADD COLUMN "branch_id"    TEXT,
  ADD COLUMN "version"      INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "ready_at"     TIMESTAMP(3),
  ADD COLUMN "delivered_at" TIMESTAMP(3);

-- ── 5. Migrar completed_at → ready_at ───────────────────────
UPDATE "kitchen_tickets"
SET "ready_at" = "completed_at"
WHERE "ready_at" IS NULL
  AND "completed_at" IS NOT NULL;

-- ── 6. Eliminar completed_at ────────────────────────────────
ALTER TABLE "kitchen_tickets"
  DROP COLUMN "completed_at";

-- ── 7. Crear tabla kitchen_ticket_items ──────────────────────
CREATE TABLE "kitchen_ticket_items" (
    "id"              TEXT NOT NULL,
    "ticket_id"       TEXT NOT NULL,
    "order_item_id"   TEXT NOT NULL,
    "menu_item_name"  TEXT NOT NULL,
    "quantity"        INTEGER NOT NULL,
    "notes"           TEXT,
    "status"          "KitchenItemStatus" NOT NULL DEFAULT 'PENDING',
    "version"         INTEGER NOT NULL DEFAULT 1,
    "started_at"      TIMESTAMP(3),
    "ready_at"        TIMESTAMP(3),
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kitchen_ticket_items_pkey" PRIMARY KEY ("id")
);

-- ── 8. Índices ──────────────────────────────────────────────
CREATE INDEX "kitchen_tickets_branch_id_idx"    ON "kitchen_tickets"("branch_id");
CREATE INDEX "kitchen_tickets_status_idx"       ON "kitchen_tickets"("status");
CREATE INDEX "kitchen_tickets_created_at_idx"   ON "kitchen_tickets"("created_at");

CREATE INDEX "kitchen_ticket_items_ticket_id_idx"     ON "kitchen_ticket_items"("ticket_id");
CREATE INDEX "kitchen_ticket_items_order_item_id_idx" ON "kitchen_ticket_items"("order_item_id");

-- ── 9. Foreign Keys ────────────────────────────────────────
ALTER TABLE "kitchen_tickets"
  ADD CONSTRAINT "kitchen_tickets_branch_id_fkey"
  FOREIGN KEY ("branch_id") REFERENCES "branches"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "kitchen_ticket_items"
  ADD CONSTRAINT "kitchen_ticket_items_ticket_id_fkey"
  FOREIGN KEY ("ticket_id") REFERENCES "kitchen_tickets"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "kitchen_ticket_items"
  ADD CONSTRAINT "kitchen_ticket_items_order_item_id_fkey"
  FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
