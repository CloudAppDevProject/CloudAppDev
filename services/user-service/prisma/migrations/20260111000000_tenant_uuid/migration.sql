-- Migration: Change tenantId to tenantUuid
-- Updates User model to reference tenant by UUID instead of integer ID

-- Step 1: Drop index on tenantId
DROP INDEX IF EXISTS "User_tenantId_idx";

-- Step 2: Add tenantUuid column
ALTER TABLE "User" ADD COLUMN "tenantUuid" UUID;

-- Step 3: Drop tenantId column (data migration should be handled by application if needed)
ALTER TABLE "User" DROP COLUMN IF EXISTS "tenantId";

-- Step 4: Add index on tenantUuid
CREATE INDEX "User_tenantUuid_idx" ON "User"("tenantUuid");
