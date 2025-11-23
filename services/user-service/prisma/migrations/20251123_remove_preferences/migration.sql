-- Remove preferences column from User table
ALTER TABLE "User" DROP COLUMN IF EXISTS "preferences";
