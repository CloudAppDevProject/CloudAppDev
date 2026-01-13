-- Migration: Tenant Auth Rework
-- Adds uuid as primary key, email, password, namespace to tenants
-- Removes id, status, maxUsers from tenants
-- Updates user_roles to reference tenant by uuid

-- Step 1: Drop foreign key constraints on user_roles
ALTER TABLE "user_roles" DROP CONSTRAINT IF EXISTS "user_roles_tenantId_fkey";

-- Step 2: Drop unique constraint on user_roles
DROP INDEX IF EXISTS "user_roles_userId_tenantId_key";

-- Step 3: Drop old indexes on tenants
DROP INDEX IF EXISTS "tenants_status_idx";

-- Step 4: Add new columns to tenants
ALTER TABLE "tenants" ADD COLUMN "uuid" UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "tenants" ADD COLUMN "email" VARCHAR(255);
ALTER TABLE "tenants" ADD COLUMN "password" VARCHAR(255);
ALTER TABLE "tenants" ADD COLUMN "namespace" VARCHAR(63);

-- Step 5: Update existing tenant with placeholder values (if any exist)
UPDATE "tenants" SET
  "email" = CONCAT('admin-', "id", '@placeholder.local'),
  "password" = '$2b$10$placeholder_password_hash_for_migration',
  "namespace" = CONCAT('tenant-', "id")
WHERE "email" IS NULL;

-- Step 6: Make new columns required
ALTER TABLE "tenants" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "tenants" ALTER COLUMN "password" SET NOT NULL;
ALTER TABLE "tenants" ALTER COLUMN "namespace" SET NOT NULL;

-- Step 7: Add tenantUuid column to user_roles and populate it
ALTER TABLE "user_roles" ADD COLUMN "tenantUuid" UUID;
UPDATE "user_roles" SET "tenantUuid" = t."uuid" FROM "tenants" t WHERE "user_roles"."tenantId" = t."id";

-- Step 8: Make tenantUuid required and drop tenantId
ALTER TABLE "user_roles" ALTER COLUMN "tenantUuid" SET NOT NULL;
ALTER TABLE "user_roles" DROP COLUMN "tenantId";
DROP INDEX IF EXISTS "user_roles_tenantId_idx";

-- Step 9: Drop old primary key and add new one with uuid
ALTER TABLE "tenants" DROP CONSTRAINT "tenants_pkey";
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("uuid");

-- Step 10: Drop id, status, maxUsers columns
ALTER TABLE "tenants" DROP COLUMN "id";
ALTER TABLE "tenants" DROP COLUMN "status";
ALTER TABLE "tenants" DROP COLUMN "maxUsers";

-- Step 11: Add unique constraints
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_email_key" UNIQUE ("email");
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_namespace_key" UNIQUE ("namespace");

-- Step 12: Add new indexes
CREATE INDEX "tenants_namespace_idx" ON "tenants"("namespace");
CREATE INDEX "user_roles_tenantUuid_idx" ON "user_roles"("tenantUuid");
CREATE UNIQUE INDEX "user_roles_userId_tenantUuid_key" ON "user_roles"("userId", "tenantUuid");

-- Step 13: Add foreign key constraint for tenantUuid
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_tenantUuid_fkey"
  FOREIGN KEY ("tenantUuid") REFERENCES "tenants"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
