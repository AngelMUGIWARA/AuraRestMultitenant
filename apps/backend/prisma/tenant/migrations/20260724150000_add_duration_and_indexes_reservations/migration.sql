-- AlterTable for Reservations: Add durationMinutes and indexes
ALTER TABLE "reservations" ADD COLUMN "duration_minutes" INTEGER NOT NULL DEFAULT 60;

-- Create indexes for conflict detection and filtering
CREATE INDEX "reservations_scheduled_at_idx" ON "reservations"("scheduled_at");
CREATE INDEX "reservations_branch_table_scheduled_idx" ON "reservations"("branch_id", "table_id", "scheduled_at");
CREATE INDEX "reservations_branch_status_scheduled_idx" ON "reservations"("branch_id", "status", "scheduled_at");

-- Set reasonable defaults for existing reservations (assume 60-minute duration)
-- This is a safe default since most restaurant reservations are ~1-2 hours
UPDATE "reservations" SET "duration_minutes" = 60 WHERE "duration_minutes" IS NULL;
