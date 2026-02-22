CREATE INDEX "Product_businessId_isActive_createdAt_idx" ON "Product"("businessId", "isActive", "createdAt");
CREATE INDEX "Product_businessId_isActive_name_idx" ON "Product"("businessId", "isActive", "name");

CREATE INDEX "Order_businessId_statusId_createdAt_idx" ON "Order"("businessId", "statusId", "createdAt");
CREATE INDEX "Order_businessId_createdAt_idx" ON "Order"("businessId", "createdAt");

CREATE INDEX "ReturnRequest_businessId_requestedAt_idx" ON "ReturnRequest"("businessId", "requestedAt");

CREATE INDEX "Payment_businessId_createdAt_idx" ON "Payment"("businessId", "createdAt");
