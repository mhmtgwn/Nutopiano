-- Big-bang role migration: USER -> SELLER_STAFF
-- Keep legacy alias support in application layer for old tokens/requests.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Role'
      AND e.enumlabel = 'SELLER_STAFF'
  ) THEN
    UPDATE "User"
    SET "role" = 'SELLER_STAFF'::"Role"
    WHERE "role"::text = 'USER';
  END IF;
END $$;
