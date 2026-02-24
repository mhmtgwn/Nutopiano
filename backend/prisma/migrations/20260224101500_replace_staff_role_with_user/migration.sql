-- Replace legacy STAFF role with USER role in Role enum.
-- PostgreSQL does not support dropping enum values directly,
-- so we recreate the enum and cast existing data.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = 'Role'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'Role'
        AND e.enumlabel = 'STAFF'
    ) THEN
      ALTER TYPE "Role" RENAME TO "Role_old";

      CREATE TYPE "Role" AS ENUM (
        'SUPER_ADMIN',
        'ADMIN',
        'SELLER',
        'USER',
        'CUSTOMER'
      );

      ALTER TABLE "User"
      ALTER COLUMN "role" TYPE "Role"
      USING (
        CASE
          WHEN "role"::text = 'STAFF' THEN 'USER'
          ELSE "role"::text
        END
      )::"Role";

      DROP TYPE "Role_old";
    END IF;
  END IF;
END $$;
