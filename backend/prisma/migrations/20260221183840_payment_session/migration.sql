-- CreateTable
CREATE TABLE "PaymentSession" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "token" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INITIATED',
    "conversationId" TEXT,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentSession_businessId_idx" ON "PaymentSession"("businessId");

-- CreateIndex
CREATE INDEX "PaymentSession_businessId_orderId_idx" ON "PaymentSession"("businessId", "orderId");

-- CreateIndex
CREATE INDEX "PaymentSession_provider_status_idx" ON "PaymentSession"("provider", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentSession_provider_token_key" ON "PaymentSession"("provider", "token");

-- AddForeignKey
ALTER TABLE "PaymentSession" ADD CONSTRAINT "PaymentSession_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSession" ADD CONSTRAINT "PaymentSession_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
