-- CreateEnum
CREATE TYPE "PayoutRequestStatus" AS ENUM ('REQUESTED', 'APPROVED', 'PAID', 'REJECTED');

-- CreateEnum
CREATE TYPE "FinanceLedgerDirection" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "FinanceLedgerAccountType" AS ENUM ('CLEARING', 'SELLER_PENDING', 'SELLER_AVAILABLE', 'PLATFORM_PENDING', 'PLATFORM_AVAILABLE', 'PLATFORM_REVENUE', 'PLATFORM_RESERVE');

-- CreateEnum
CREATE TYPE "FinanceLedgerEventType" AS ENUM ('ORDER_SALE', 'ORDER_REFUND', 'PAYOUT_REQUEST', 'PAYOUT_PAID', 'MANUAL_ADJUSTMENT');

-- CreateTable
CREATE TABLE "SellerWallet" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "sellerId" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "pendingBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "availableBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformWallet" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "pendingBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "availableBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "reserveBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutRequest" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "sellerId" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "status" "PayoutRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceLedgerEntry" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" "FinanceLedgerEventType" NOT NULL,
    "accountType" "FinanceLedgerAccountType" NOT NULL,
    "direction" "FinanceLedgerDirection" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "orderId" INTEGER,
    "sellerId" INTEGER,
    "payoutRequestId" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SellerWallet_businessId_sellerId_currency_key" ON "SellerWallet"("businessId", "sellerId", "currency");

-- CreateIndex
CREATE INDEX "SellerWallet_businessId_sellerId_idx" ON "SellerWallet"("businessId", "sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformWallet_businessId_currency_key" ON "PlatformWallet"("businessId", "currency");

-- CreateIndex
CREATE INDEX "PlatformWallet_businessId_idx" ON "PlatformWallet"("businessId");

-- CreateIndex
CREATE INDEX "PayoutRequest_businessId_sellerId_status_idx" ON "PayoutRequest"("businessId", "sellerId", "status");

-- CreateIndex
CREATE INDEX "PayoutRequest_businessId_status_createdAt_idx" ON "PayoutRequest"("businessId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "FinanceLedgerEntry_businessId_eventId_createdAt_idx" ON "FinanceLedgerEntry"("businessId", "eventId", "createdAt");

-- CreateIndex
CREATE INDEX "FinanceLedgerEntry_businessId_eventType_createdAt_idx" ON "FinanceLedgerEntry"("businessId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "FinanceLedgerEntry_businessId_orderId_createdAt_idx" ON "FinanceLedgerEntry"("businessId", "orderId", "createdAt");

-- CreateIndex
CREATE INDEX "FinanceLedgerEntry_businessId_sellerId_createdAt_idx" ON "FinanceLedgerEntry"("businessId", "sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "FinanceLedgerEntry_businessId_payoutRequestId_createdAt_idx" ON "FinanceLedgerEntry"("businessId", "payoutRequestId", "createdAt");

-- AddForeignKey
ALTER TABLE "SellerWallet" ADD CONSTRAINT "SellerWallet_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerWallet" ADD CONSTRAINT "SellerWallet_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformWallet" ADD CONSTRAINT "PlatformWallet_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceLedgerEntry" ADD CONSTRAINT "FinanceLedgerEntry_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceLedgerEntry" ADD CONSTRAINT "FinanceLedgerEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceLedgerEntry" ADD CONSTRAINT "FinanceLedgerEntry_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceLedgerEntry" ADD CONSTRAINT "FinanceLedgerEntry_payoutRequestId_fkey" FOREIGN KEY ("payoutRequestId") REFERENCES "PayoutRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
