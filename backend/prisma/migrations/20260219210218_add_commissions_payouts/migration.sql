-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('pending', 'approved', 'completed');

-- CreateTable
CREATE TABLE "Commission" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "beneficiaryUserId" INTEGER NOT NULL,
    "orderId" INTEGER NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "grossAmountCents" INTEGER NOT NULL,
    "commissionAmountCents" INTEGER NOT NULL,
    "netAmountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "beneficiaryUserId" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'pending',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Commission_orderId_key" ON "Commission"("orderId");

-- CreateIndex
CREATE INDEX "Commission_businessId_idx" ON "Commission"("businessId");

-- CreateIndex
CREATE INDEX "Commission_businessId_beneficiaryUserId_idx" ON "Commission"("businessId", "beneficiaryUserId");

-- CreateIndex
CREATE INDEX "Payout_businessId_idx" ON "Payout"("businessId");

-- CreateIndex
CREATE INDEX "Payout_businessId_beneficiaryUserId_idx" ON "Payout"("businessId", "beneficiaryUserId");

-- CreateIndex
CREATE INDEX "Payout_businessId_status_idx" ON "Payout"("businessId", "status");

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_beneficiaryUserId_fkey" FOREIGN KEY ("beneficiaryUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_beneficiaryUserId_fkey" FOREIGN KEY ("beneficiaryUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
