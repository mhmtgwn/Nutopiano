-- AlterEnum
ALTER TYPE "FinanceLedgerEventType" ADD VALUE IF NOT EXISTS 'RELEASE_AVAILABLE';

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "payoutReleasedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Order_businessId_payoutReleasedAt_createdAt_idx"
ON "Order"("businessId", "payoutReleasedAt", "createdAt");
