ALTER TABLE "Order"
ADD COLUMN "subtotalAmountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "taxAmountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "taxRateBps" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "OrderItem"
ADD COLUMN "subtotalAmountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "taxAmountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "taxRateBps" INTEGER NOT NULL DEFAULT 0;

UPDATE "OrderItem"
SET
  "subtotalAmountCents" = "totalAmountCents",
  "taxAmountCents" = 0,
  "taxRateBps" = 0
WHERE "subtotalAmountCents" = 0;

UPDATE "Order"
SET
  "subtotalAmountCents" = "totalAmountCents",
  "taxAmountCents" = 0,
  "taxRateBps" = 0
WHERE "subtotalAmountCents" = 0;
