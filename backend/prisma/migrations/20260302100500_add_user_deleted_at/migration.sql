-- Fix production login failure: ensure User soft-delete column exists.
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
