-- AlterTable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'OrderItem'
      AND column_name = 'subtotalAmountCents'
  ) THEN
    EXECUTE 'ALTER TABLE "OrderItem" ALTER COLUMN "subtotalAmountCents" DROP DEFAULT';
  END IF;
END $$;
