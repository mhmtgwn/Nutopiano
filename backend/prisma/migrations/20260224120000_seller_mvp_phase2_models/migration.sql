-- CreateEnum
CREATE TYPE "CategoryScopeType" AS ENUM ('GLOBAL', 'SELLER_STORE');

-- CreateEnum
CREATE TYPE "SellerInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CreditBlockPolicy" AS ENUM ('NONE', 'WARN', 'BLOCK');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "LedgerSourceType" AS ENUM ('SALE_DEBIT', 'PAYMENT_CREDIT', 'RETURN_REVERSAL', 'CANCEL_REVERSAL', 'MANUAL_ADJUSTMENT');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "scopeType" "CategoryScopeType" NOT NULL DEFAULT 'GLOBAL',
ADD COLUMN     "sellerId" INTEGER;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "creditBlockPolicy" "CreditBlockPolicy" NOT NULL DEFAULT 'WARN',
ADD COLUMN     "creditLimitCents" INTEGER;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "sellerId" INTEGER;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "costSnapshotCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "createdByUserId" INTEGER,
ADD COLUMN     "sellerId" INTEGER;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "costPriceCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ownerSellerId" INTEGER,
ADD COLUMN     "publishedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SellerTeamMember" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "sellerId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "invitedByUserId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "permissionsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerInvite" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "sellerId" INTEGER NOT NULL,
    "targetUserId" INTEGER NOT NULL,
    "invitedByUserId" INTEGER NOT NULL,
    "status" "SellerInviteStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerLedgerEntry" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "sellerId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "orderId" INTEGER,
    "type" "LedgerEntryType" NOT NULL,
    "sourceType" "LedgerSourceType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "balanceAfterCents" INTEGER NOT NULL,
    "createdByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SellerTeamMember_businessId_sellerId_isActive_idx" ON "SellerTeamMember"("businessId", "sellerId", "isActive");

-- CreateIndex
CREATE INDEX "SellerTeamMember_businessId_userId_isActive_idx" ON "SellerTeamMember"("businessId", "userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SellerTeamMember_sellerId_userId_key" ON "SellerTeamMember"("sellerId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerInvite_token_key" ON "SellerInvite"("token");

-- CreateIndex
CREATE INDEX "SellerInvite_businessId_sellerId_status_createdAt_idx" ON "SellerInvite"("businessId", "sellerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SellerInvite_businessId_targetUserId_status_createdAt_idx" ON "SellerInvite"("businessId", "targetUserId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerLedgerEntry_businessId_sellerId_customerId_createdA_idx" ON "CustomerLedgerEntry"("businessId", "sellerId", "customerId", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerLedgerEntry_businessId_sellerId_createdAt_idx" ON "CustomerLedgerEntry"("businessId", "sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerLedgerEntry_businessId_orderId_idx" ON "CustomerLedgerEntry"("businessId", "orderId");

-- CreateIndex
CREATE INDEX "OutboxEvent_businessId_aggregateType_aggregateId_idx" ON "OutboxEvent"("businessId", "aggregateType", "aggregateId");

-- CreateIndex
CREATE INDEX "OutboxEvent_businessId_eventType_createdAt_idx" ON "OutboxEvent"("businessId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_processedAt_idx" ON "OutboxEvent"("processedAt");

-- CreateIndex
CREATE INDEX "Category_businessId_scopeType_idx" ON "Category"("businessId", "scopeType");

-- CreateIndex
CREATE INDEX "Category_businessId_sellerId_parentId_idx" ON "Category"("businessId", "sellerId", "parentId");

-- CreateIndex
CREATE INDEX "Category_businessId_sellerId_orderIndex_idx" ON "Category"("businessId", "sellerId", "orderIndex");

-- CreateIndex
CREATE INDEX "Order_businessId_sellerId_createdAt_idx" ON "Order"("businessId", "sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_businessId_sellerId_createdAt_idx" ON "Payment"("businessId", "sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "Product_businessId_ownerSellerId_isPublished_idx" ON "Product"("businessId", "ownerSellerId", "isPublished");

-- CreateIndex
CREATE INDEX "Product_businessId_ownerSellerId_isActive_createdAt_idx" ON "Product"("businessId", "ownerSellerId", "isActive", "createdAt");

-- AddForeignKey
ALTER TABLE "SellerTeamMember" ADD CONSTRAINT "SellerTeamMember_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerTeamMember" ADD CONSTRAINT "SellerTeamMember_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerTeamMember" ADD CONSTRAINT "SellerTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerTeamMember" ADD CONSTRAINT "SellerTeamMember_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerInvite" ADD CONSTRAINT "SellerInvite_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerInvite" ADD CONSTRAINT "SellerInvite_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerInvite" ADD CONSTRAINT "SellerInvite_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerInvite" ADD CONSTRAINT "SellerInvite_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_ownerSellerId_fkey" FOREIGN KEY ("ownerSellerId") REFERENCES "Seller"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLedgerEntry" ADD CONSTRAINT "CustomerLedgerEntry_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLedgerEntry" ADD CONSTRAINT "CustomerLedgerEntry_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLedgerEntry" ADD CONSTRAINT "CustomerLedgerEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLedgerEntry" ADD CONSTRAINT "CustomerLedgerEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLedgerEntry" ADD CONSTRAINT "CustomerLedgerEntry_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboxEvent" ADD CONSTRAINT "OutboxEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


