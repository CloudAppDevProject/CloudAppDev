-- Cleanup script for duplicate user_roles
-- Keep only the most recent role assignment per user per tenant

-- Step 1: Show current duplicates
SELECT user_id, tenant_id, COUNT(*) as role_count
FROM user_roles
GROUP BY user_id, tenant_id
HAVING COUNT(*) > 1;

-- Step 2: Delete older duplicate entries, keeping the most recent one
-- This uses a CTE to identify rows to keep
WITH ranked_roles AS (
  SELECT 
    id,
    user_id,
    tenant_id,
    role_id,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, tenant_id 
      ORDER BY created_at DESC
    ) as rn
  FROM user_roles
)
DELETE FROM user_roles
WHERE id IN (
  SELECT id 
  FROM ranked_roles 
  WHERE rn > 1
);

-- Step 3: Verify no duplicates remain
SELECT user_id, tenant_id, COUNT(*) as role_count
FROM user_roles
GROUP BY user_id, tenant_id
HAVING COUNT(*) > 1;
