-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "idempotencyOperation" TEXT,
ADD COLUMN "idempotencyChannel" "CommerceChannel";

-- DropIndex
DROP INDEX IF EXISTS "Order_businessId_idempotencyKey_key";

-- CreateIndex
CREATE UNIQUE INDEX "Order_businessId_idempotencyOperation_idempotencyChannel_idempotencyKey_key"
ON "Order"("businessId", "idempotencyOperation", "idempotencyChannel", "idempotencyKey");

-- CreateIndex
CREATE INDEX "Order_businessId_idempotencyKey_idx"
ON "Order"("businessId", "idempotencyKey");
