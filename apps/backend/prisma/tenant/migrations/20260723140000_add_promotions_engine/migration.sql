-- 1. Extend Enum PromotionType with backward compatibility
ALTER TYPE "PromotionType" ADD VALUE IF NOT EXISTS 'SPECIAL_PRICE';
ALTER TYPE "PromotionType" ADD VALUE IF NOT EXISTS 'CATEGORY_PERCENTAGE';
ALTER TYPE "PromotionType" ADD VALUE IF NOT EXISTS 'CATEGORY_FIXED';

-- 2. Modify promotions table
ALTER TABLE "promotions"
  ADD COLUMN IF NOT EXISTS "max_amount"    DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "special_price" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "buy_quantity"  INT,
  ADD COLUMN IF NOT EXISTS "get_quantity"  INT,
  ADD COLUMN IF NOT EXISTS "start_minute"  INT,
  ADD COLUMN IF NOT EXISTS "end_minute"    INT,
  ADD COLUMN IF NOT EXISTS "priority"      INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "branch_id"     TEXT;

-- CHECK constraints for promotions table
ALTER TABLE "promotions"
  ADD CONSTRAINT "chk_promotions_value" CHECK ("value" >= 0),
  ADD CONSTRAINT "chk_promotions_start_minute" CHECK ("start_minute" IS NULL OR ("start_minute" >= 0 AND "start_minute" <= 1439)),
  ADD CONSTRAINT "chk_promotions_end_minute" CHECK ("end_minute" IS NULL OR ("end_minute" >= 0 AND "end_minute" <= 1439)),
  ADD CONSTRAINT "chk_promotions_priority" CHECK ("priority" >= 0);

-- Foreign Key for promotions.branch_id
ALTER TABLE "promotions"
  ADD CONSTRAINT "fk_promotions_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_promotions_branch_id" ON "promotions"("branch_id");

-- 3. Create bridge table promotion_categories
CREATE TABLE IF NOT EXISTS "promotion_categories" (
  "promotion_id" TEXT NOT NULL,
  "category_id"  TEXT NOT NULL,
  CONSTRAINT "promotion_categories_pkey" PRIMARY KEY ("promotion_id", "category_id"),
  CONSTRAINT "fk_promotion_categories_promotion" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "fk_promotion_categories_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_promotion_categories_category_id" ON "promotion_categories"("category_id");

-- 4. Create bridge table promotion_items
CREATE TABLE IF NOT EXISTS "promotion_items" (
  "promotion_id" TEXT NOT NULL,
  "menu_item_id" TEXT NOT NULL,
  "is_target"    BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "promotion_items_pkey" PRIMARY KEY ("promotion_id", "menu_item_id"),
  CONSTRAINT "fk_promotion_items_promotion" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "fk_promotion_items_menu_item" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_promotion_items_menu_item_id" ON "promotion_items"("menu_item_id");

-- 5. Modify orders table
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "promotion_amount"  DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "promoted_subtotal" DECIMAL(10,2);

-- 6. Modify order_items table
ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "promotion_id"             TEXT,
  ADD COLUMN IF NOT EXISTS "promotion_name_snapshot"  TEXT,
  ADD COLUMN IF NOT EXISTS "promotion_type_snapshot"  TEXT,
  ADD COLUMN IF NOT EXISTS "promotion_value_snapshot" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "promotion_quantity"       INT,
  ADD COLUMN IF NOT EXISTS "promotion_amount"         DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "original_unit_price"     DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "effective_unit_price"    DECIMAL(10,2);

ALTER TABLE "order_items"
  ADD CONSTRAINT "fk_order_items_promotion" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_order_items_promotion_id" ON "order_items"("promotion_id");

-- 7. Create order_promotions table
CREATE TABLE IF NOT EXISTS "order_promotions" (
  "id"               TEXT NOT NULL,
  "order_id"         TEXT NOT NULL,
  "promotion_id"     TEXT NOT NULL,
  "name_snapshot"    TEXT NOT NULL,
  "type_snapshot"    TEXT NOT NULL,
  "value_snapshot"   DECIMAL(10,2) NOT NULL,
  "promotion_amount" DECIMAL(10,2) NOT NULL,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_promotions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fk_order_promotions_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "fk_order_promotions_promotion" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_order_promotions_order_id" ON "order_promotions"("order_id");
CREATE INDEX IF NOT EXISTS "idx_order_promotions_promotion_id" ON "order_promotions"("promotion_id");
