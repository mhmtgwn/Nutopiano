ALTER TABLE "Order"
ADD COLUMN "shipmentCarrier" TEXT,
ADD COLUMN "shipmentTrackingNumber" TEXT;

CREATE INDEX "Order_businessId_shipmentTrackingNumber_idx" ON "Order"("businessId", "shipmentTrackingNumber");
