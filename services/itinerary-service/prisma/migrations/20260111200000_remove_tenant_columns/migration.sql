-- Remove tenantId columns from Itinerary and Location tables
-- Tenant filtering is now done via user_id lookup to user-service

-- Remove index first
DROP INDEX IF EXISTS "Itinerary_tenantId_idx";
DROP INDEX IF EXISTS "Location_tenantId_idx";

-- Remove columns
ALTER TABLE "Itinerary" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "Location" DROP COLUMN IF EXISTS "tenantId";
