ALTER TABLE "OrderItem"
ADD COLUMN "productName" TEXT;

UPDATE "OrderItem" oi
SET "productName" = p."name"
FROM "Product" p
WHERE oi."productId" = p."id"
  AND oi."productName" IS NULL;

ALTER TABLE "OrderItem"
ALTER COLUMN "productName" SET NOT NULL;
