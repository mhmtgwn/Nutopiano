ALTER TABLE "Order"
ADD COLUMN "idempotencyKey" TEXT,
ADD COLUMN "idempotencyHash" TEXT;

CREATE UNIQUE INDEX "Order_businessId_idempotencyKey_key" ON "Order"("businessId", "idempotencyKey");
