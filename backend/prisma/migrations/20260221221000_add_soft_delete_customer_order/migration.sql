ALTER TABLE "Customer"
ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "Order"
ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "Customer_businessId_deletedAt_idx" ON "Customer"("businessId", "deletedAt");
CREATE INDEX "Order_businessId_deletedAt_idx" ON "Order"("businessId", "deletedAt");
