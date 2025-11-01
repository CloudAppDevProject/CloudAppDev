/*
  Warnings:

  - Made the column `password` on the `User` table optional (for Google OAuth users).
  - A unique constraint covering the columns `[googleUid]` on the table `User` will be added.

*/

-- AlterTable: Make password optional for Google OAuth users
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

-- AlterTable: Add Google OAuth field
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleUid" TEXT;

-- AlterTable: Add timestamps with defaults for existing rows
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex: Add unique index on googleUid (only if it doesn't exist)
CREATE UNIQUE INDEX IF NOT EXISTS "User_googleUid_key" ON "User"("googleUid");
