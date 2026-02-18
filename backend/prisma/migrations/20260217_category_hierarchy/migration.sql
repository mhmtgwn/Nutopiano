-- AlterTable - Add parentId to Category for hierarchical structure
ALTER TABLE "Category" ADD COLUMN "parentId" INTEGER;

-- CreateIndex - for parent-child relationships
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");
CREATE INDEX "Category_businessId_parentId_idx" ON "Category"("businessId", "parentId");

-- AddForeignKey - parent category relationship (self-referencing)
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable - Make categoryId NOT NULL in Product 
-- First, create a default category per business (if needed) and move NULL-category products into it.
-- NOTE: Category.createdByUserId is required, so we pick an ADMIN user from the same business.

INSERT INTO "Category" ("businessId", "createdByUserId", "name", "slug", "parentId", "isActive", "orderIndex", "archivedAt", "createdAt", "updatedAt")
SELECT
  b."id" AS "businessId",
  (
    SELECT u."id"
    FROM "User" u
    WHERE u."businessId" = b."id"
    ORDER BY (u."role" = 'ADMIN') DESC, u."id" ASC
    LIMIT 1
  ) AS "createdByUserId",
  'Genel' AS "name",
  'genel' AS "slug",
  NULL AS "parentId",
  TRUE AS "isActive",
  0 AS "orderIndex",
  NULL AS "archivedAt",
  NOW() AS "createdAt",
  NOW() AS "updatedAt"
FROM "Business" b
WHERE EXISTS (
  SELECT 1 FROM "Product" p WHERE p."businessId" = b."id" AND p."categoryId" IS NULL
)
AND EXISTS (
  SELECT 1 FROM "User" u WHERE u."businessId" = b."id"
)
AND NOT EXISTS (
  SELECT 1 FROM "Category" c WHERE c."businessId" = b."id" AND c."slug" = 'genel'
);

UPDATE "Product" p
SET "categoryId" = c."id"
FROM "Category" c
WHERE p."categoryId" IS NULL
  AND p."businessId" = c."businessId"
  AND c."slug" = 'genel';

-- Then alter the column
ALTER TABLE "Product" ALTER COLUMN "categoryId" SET NOT NULL;

-- Update the foreign key constraint (do not cascade delete categories -> products)
ALTER TABLE "Product" DROP CONSTRAINT "Product_categoryId_fkey";
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex - for product category queries
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

