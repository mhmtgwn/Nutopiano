CREATE TABLE "ProductVariant" (
  "id" SERIAL NOT NULL,
  "businessId" INTEGER NOT NULL,
  "productId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "sku" TEXT,
  "color" TEXT,
  "size" TEXT,
  "material" TEXT,
  "priceCents" INTEGER NOT NULL,
  "stock" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "OrderItem"
ADD COLUMN "variantId" INTEGER;

CREATE INDEX "ProductVariant_businessId_productId_idx" ON "ProductVariant"("businessId", "productId");
CREATE INDEX "ProductVariant_businessId_productId_isActive_idx" ON "ProductVariant"("businessId", "productId", "isActive");
CREATE UNIQUE INDEX "ProductVariant_businessId_productId_sku_key" ON "ProductVariant"("businessId", "productId", "sku");
CREATE INDEX "OrderItem_businessId_variantId_idx" ON "OrderItem"("businessId", "variantId");

ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
