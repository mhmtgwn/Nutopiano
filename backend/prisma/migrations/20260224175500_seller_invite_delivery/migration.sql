-- CreateEnum
CREATE TYPE "InviteDeliveryChannel" AS ENUM ('EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "InviteDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'RETRY', 'DEAD_LETTER');

-- CreateTable
CREATE TABLE "SellerInviteDelivery" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "inviteId" INTEGER NOT NULL,
    "channel" "InviteDeliveryChannel" NOT NULL,
    "status" "InviteDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "target" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerInviteDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SellerInviteDelivery_inviteId_channel_key" ON "SellerInviteDelivery"("inviteId", "channel");

-- CreateIndex
CREATE INDEX "SellerInviteDelivery_businessId_status_nextRetryAt_createdAt_idx" ON "SellerInviteDelivery"("businessId", "status", "nextRetryAt", "createdAt");

-- CreateIndex
CREATE INDEX "SellerInviteDelivery_businessId_inviteId_channel_idx" ON "SellerInviteDelivery"("businessId", "inviteId", "channel");

-- AddForeignKey
ALTER TABLE "SellerInviteDelivery" ADD CONSTRAINT "SellerInviteDelivery_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerInviteDelivery" ADD CONSTRAINT "SellerInviteDelivery_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "SellerInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
