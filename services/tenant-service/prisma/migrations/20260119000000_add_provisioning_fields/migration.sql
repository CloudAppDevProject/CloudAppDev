-- Migration: Add Provisioning Fields
-- Adds domain, provisioningStatus, and provisioningError columns to tenants
-- These fields track the infrastructure provisioning state for each tenant

-- Step 1: Add domain column (nullable - populated after provisioning)
ALTER TABLE "tenants" ADD COLUMN "domain" VARCHAR(255);

-- Step 2: Add provisioning_status column with default 'pending'
ALTER TABLE "tenants" ADD COLUMN "provisioning_status" VARCHAR(50) NOT NULL DEFAULT 'pending';

-- Step 3: Add provisioning_error column (nullable - only set on failure)
ALTER TABLE "tenants" ADD COLUMN "provisioning_error" TEXT;

-- Step 4: Add index on provisioning_status for efficient filtering
CREATE INDEX "tenants_provisioning_status_idx" ON "tenants"("provisioning_status");
