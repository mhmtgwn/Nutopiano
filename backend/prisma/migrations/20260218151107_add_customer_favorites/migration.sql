-- CreateTable
CREATE TABLE "CustomerFavorite" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerFavorite_businessId_idx" ON "CustomerFavorite"("businessId");

-- CreateIndex
CREATE INDEX "CustomerFavorite_businessId_customerId_idx" ON "CustomerFavorite"("businessId", "customerId");

-- CreateIndex
CREATE INDEX "CustomerFavorite_businessId_productId_idx" ON "CustomerFavorite"("businessId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerFavorite_businessId_customerId_productId_key" ON "CustomerFavorite"("businessId", "customerId", "productId");

-- AddForeignKey
ALTER TABLE "CustomerFavorite" ADD CONSTRAINT "CustomerFavorite_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFavorite" ADD CONSTRAINT "CustomerFavorite_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFavorite" ADD CONSTRAINT "CustomerFavorite_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
