/*
  Warnings:

  - A unique constraint covering the columns `[voice_username]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "voice_seed_hash" TEXT,
ADD COLUMN     "voice_username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_voice_username_key" ON "users"("voice_username");
