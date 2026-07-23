-- DropSettingsBranchIdUniqueIndex
-- The original migration created TWO unique indexes on the settings table:
--   1. settings_branch_id_key       ON ("branch_id")            ← WRONG: limits to 1 row per branch
--   2. settings_branch_id_key_key   ON ("branch_id", "key")     ← CORRECT: allows multiple keys per branch
--
-- The Settings model is a key-value store per branch (@@unique([branchId, key])).
-- The single-column unique on branch_id is a bug that must be dropped.
--
-- This migration:
--   - Drops the incorrect single-column unique index
--   - Preserves the composite unique index (branch_id, key)
--   - Is safe for tenants with 0 or 1 existing settings rows per branch
--   - Does NOT modify data

-- DropIndex (safe even if index does not exist)
DROP INDEX IF EXISTS "settings_branch_id_key";
