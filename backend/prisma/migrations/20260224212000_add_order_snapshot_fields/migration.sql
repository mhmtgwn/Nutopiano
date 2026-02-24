-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "platformRevenueCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "sellerPayoutCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'TRY',
ADD COLUMN "calculationProfileId" TEXT,
ADD COLUMN "calculationVersion" TEXT,
ADD COLUMN "breakdownJson" JSONB,
ADD COLUMN "priceMismatch" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "priceMismatchMetaJson" JSONB,
ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT 'TR',
ADD COLUMN "taxProfileCode" TEXT,
ADD COLUMN "commissionProfileCode" TEXT;

-- CreateIndex
CREATE INDEX "Order_businessId_priceMismatch_createdAt_idx"
ON "Order"("businessId", "priceMismatch", "createdAt");
