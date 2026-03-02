-- Fix production auth failures: ensure last login timestamp column exists.
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);
