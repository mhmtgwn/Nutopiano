-- Phase 1 commerce standardization: lifecycle, store preparation, payment transactions/refunds

CREATE TYPE "OrderLifecycleState" AS ENUM (
  'DRAFT',
  'PENDING',
  'AUTHORIZED',
  'PAID',
  'FULFILLING',
  'FULFILLED',
  'CANCELLED',
  'REFUND_PENDING',
  'REFUNDED'
);

CREATE TYPE "PaymentTransactionKind" AS ENUM (
  'SALE',
  'CAPTURE',
  'REFUND',
  'CANCEL'
);

CREATE TYPE "PaymentTransactionStatus" AS ENUM (
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED'
);

CREATE TYPE "RefundStatus" AS ENUM (
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED'
);

ALTER TABLE "Customer" ADD COLUMN "storeId" INTEGER;
ALTER TABLE "Product" ADD COLUMN "storeId" INTEGER;
ALTER TABLE "Order" ADD COLUMN "storeId" INTEGER;
ALTER TABLE "Order" ADD COLUMN "lifecycleState" "OrderLifecycleState" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Payment" ADD COLUMN "storeId" INTEGER;

CREATE TABLE "PaymentTransaction" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "orderId" INTEGER NOT NULL,
    "paymentId" INTEGER,
    "storeId" INTEGER,
    "createdByUserId" INTEGER,
    "provider" "PaymentProvider",
    "kind" "PaymentTransactionKind" NOT NULL,
    "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amountCents" INTEGER NOT NULL,
    "method" "PaymentMethod",
    "externalReference" TEXT,
    "idempotencyKey" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Refund" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "orderId" INTEGER NOT NULL,
    "paymentId" INTEGER,
    "paymentTransactionId" INTEGER,
    "storeId" INTEGER,
    "createdByUserId" INTEGER,
    "amountCents" INTEGER NOT NULL,
    "method" "PaymentMethod",
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "externalReference" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Customer_businessId_storeId_idx" ON "Customer"("businessId", "storeId");
CREATE INDEX "Product_businessId_storeId_isActive_idx" ON "Product"("businessId", "storeId", "isActive");
CREATE INDEX "Order_businessId_storeId_createdAt_idx" ON "Order"("businessId", "storeId", "createdAt");
CREATE INDEX "Order_businessId_lifecycleState_createdAt_idx" ON "Order"("businessId", "lifecycleState", "createdAt");
CREATE INDEX "Payment_businessId_storeId_createdAt_idx" ON "Payment"("businessId", "storeId", "createdAt");

CREATE INDEX "PaymentTransaction_businessId_orderId_createdAt_idx" ON "PaymentTransaction"("businessId", "orderId", "createdAt");
CREATE INDEX "PaymentTransaction_businessId_paymentId_createdAt_idx" ON "PaymentTransaction"("businessId", "paymentId", "createdAt");
CREATE INDEX "PaymentTransaction_businessId_storeId_createdAt_idx" ON "PaymentTransaction"("businessId", "storeId", "createdAt");
CREATE INDEX "PaymentTransaction_businessId_status_createdAt_idx" ON "PaymentTransaction"("businessId", "status", "createdAt");
CREATE INDEX "PaymentTransaction_businessId_kind_createdAt_idx" ON "PaymentTransaction"("businessId", "kind", "createdAt");

CREATE INDEX "Refund_businessId_orderId_createdAt_idx" ON "Refund"("businessId", "orderId", "createdAt");
CREATE INDEX "Refund_businessId_paymentId_createdAt_idx" ON "Refund"("businessId", "paymentId", "createdAt");
CREATE INDEX "Refund_businessId_paymentTransactionId_createdAt_idx" ON "Refund"("businessId", "paymentTransactionId", "createdAt");
CREATE INDEX "Refund_businessId_status_createdAt_idx" ON "Refund"("businessId", "status", "createdAt");
CREATE INDEX "Refund_businessId_storeId_createdAt_idx" ON "Refund"("businessId", "storeId", "createdAt");

ALTER TABLE "PaymentTransaction"
  ADD CONSTRAINT "PaymentTransaction_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaymentTransaction"
  ADD CONSTRAINT "PaymentTransaction_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaymentTransaction"
  ADD CONSTRAINT "PaymentTransaction_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentTransaction"
  ADD CONSTRAINT "PaymentTransaction_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Refund"
  ADD CONSTRAINT "Refund_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Refund"
  ADD CONSTRAINT "Refund_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Refund"
  ADD CONSTRAINT "Refund_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Refund"
  ADD CONSTRAINT "Refund_paymentTransactionId_fkey"
  FOREIGN KEY ("paymentTransactionId") REFERENCES "PaymentTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Refund"
  ADD CONSTRAINT "Refund_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
