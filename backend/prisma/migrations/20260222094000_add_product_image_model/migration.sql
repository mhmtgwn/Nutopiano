CREATE TABLE "ProductImage" (
  "id" SERIAL NOT NULL,
  "businessId" INTEGER NOT NULL,
  "productId" INTEGER NOT NULL,
  "url" TEXT NOT NULL,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductImage_businessId_productId_idx" ON "ProductImage"("businessId", "productId");
CREATE INDEX "ProductImage_businessId_productId_orderIndex_idx" ON "ProductImage"("businessId", "productId", "orderIndex");

ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill from Product.images array
INSERT INTO "ProductImage" ("businessId", "productId", "url", "orderIndex", "isPrimary")
SELECT
  p."businessId",
  p."id",
  img.url,
  img.ord - 1,
  (img.url = p."imageUrl")
FROM "Product" p
CROSS JOIN LATERAL unnest(p."images") WITH ORDINALITY AS img(url, ord)
WHERE img.url IS NOT NULL AND length(trim(img.url)) > 0;

-- Ensure single-image products are also represented if images[] was empty
INSERT INTO "ProductImage" ("businessId", "productId", "url", "orderIndex", "isPrimary")
SELECT
  p."businessId",
  p."id",
  p."imageUrl",
  0,
  true
FROM "Product" p
WHERE p."imageUrl" IS NOT NULL
  AND length(trim(p."imageUrl")) > 0
  AND NOT EXISTS (
    SELECT 1 FROM "ProductImage" pi
    WHERE pi."productId" = p."id" AND pi."url" = p."imageUrl"
  );
