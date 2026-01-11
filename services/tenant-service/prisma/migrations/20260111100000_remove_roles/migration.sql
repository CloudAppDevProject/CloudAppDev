-- Migration: Remove Roles
-- Drops roles and user_roles tables as role management is no longer needed
-- Authorization is now handled via loginType (user vs tenant_admin) and environment variables

-- Step 1: Drop foreign key constraints on user_roles
ALTER TABLE "user_roles" DROP CONSTRAINT IF EXISTS "user_roles_roleId_fkey";
ALTER TABLE "user_roles" DROP CONSTRAINT IF EXISTS "user_roles_tenantUuid_fkey";

-- Step 2: Drop the user_roles table
DROP TABLE IF EXISTS "user_roles";

-- Step 3: Drop the roles table
DROP TABLE IF EXISTS "roles";
