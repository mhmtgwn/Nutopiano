-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SELLER_STAFF';

-- DropForeignKey
ALTER TABLE "SellerInviteDelivery" DROP CONSTRAINT "SellerInviteDelivery_inviteId_fkey";

-- DropIndex
DROP INDEX "CashRegisterSession_businessId_registerCode_active_idx";

-- DropIndex
DROP INDEX "Order_businessId_shipmentTrackingNumber_idx";

-- AlterTable
ALTER TABLE "CashRegisterSession" ALTER COLUMN "registerCode" DROP DEFAULT;

-- AlterTable
ALTER TABLE "OutboxEvent" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PermissionGroup" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermissionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPermissionGroup" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "permissionGroupId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPermissionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTwoFactor" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "secret" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "backupCodes" JSONB,
    "enabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTwoFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "sellerId" INTEGER,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "scopes" JSONB NOT NULL,
    "ipWhitelist" JSONB,
    "rateLimit" INTEGER,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "dismissedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigSnapshot" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "configType" TEXT NOT NULL,
    "configKey" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfigSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "variables" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsTemplate" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "variables" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PermissionGroup_businessId_idx" ON "PermissionGroup"("businessId");

-- CreateIndex
CREATE INDEX "PermissionGroup_businessId_isActive_idx" ON "PermissionGroup"("businessId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PermissionGroup_businessId_name_key" ON "PermissionGroup"("businessId", "name");

-- CreateIndex
CREATE INDEX "UserPermissionGroup_businessId_userId_idx" ON "UserPermissionGroup"("businessId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermissionGroup_userId_permissionGroupId_key" ON "UserPermissionGroup"("userId", "permissionGroupId");

-- CreateIndex
CREATE INDEX "FeatureFlag_scope_isActive_idx" ON "FeatureFlag"("scope", "isActive");

-- CreateIndex
CREATE INDEX "FeatureFlag_businessId_isActive_idx" ON "FeatureFlag"("businessId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_businessId_key" ON "FeatureFlag"("key", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTwoFactor_userId_key" ON "UserTwoFactor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_businessId_idx" ON "ApiKey"("businessId");

-- CreateIndex
CREATE INDEX "ApiKey_businessId_sellerId_idx" ON "ApiKey"("businessId", "sellerId");

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "Notification_businessId_isRead_createdAt_idx" ON "Notification"("businessId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_businessId_type_createdAt_idx" ON "Notification"("businessId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "ConfigSnapshot_businessId_configType_configKey_idx" ON "ConfigSnapshot"("businessId", "configType", "configKey");

-- CreateIndex
CREATE INDEX "ConfigSnapshot_businessId_configType_version_idx" ON "ConfigSnapshot"("businessId", "configType", "version");

-- CreateIndex
CREATE INDEX "EmailTemplate_businessId_idx" ON "EmailTemplate"("businessId");

-- CreateIndex
CREATE INDEX "EmailTemplate_businessId_isActive_idx" ON "EmailTemplate"("businessId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_businessId_key_key" ON "EmailTemplate"("businessId", "key");

-- CreateIndex
CREATE INDEX "SmsTemplate_businessId_idx" ON "SmsTemplate"("businessId");

-- CreateIndex
CREATE INDEX "SmsTemplate_businessId_isActive_idx" ON "SmsTemplate"("businessId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SmsTemplate_businessId_key_key" ON "SmsTemplate"("businessId", "key");

-- AddForeignKey
ALTER TABLE "SellerInviteDelivery" ADD CONSTRAINT "SellerInviteDelivery_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "SellerInvite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionGroup" ADD CONSTRAINT "PermissionGroup_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermissionGroup" ADD CONSTRAINT "UserPermissionGroup_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermissionGroup" ADD CONSTRAINT "UserPermissionGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermissionGroup" ADD CONSTRAINT "UserPermissionGroup_permissionGroupId_fkey" FOREIGN KEY ("permissionGroupId") REFERENCES "PermissionGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTwoFactor" ADD CONSTRAINT "UserTwoFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigSnapshot" ADD CONSTRAINT "ConfigSnapshot_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsTemplate" ADD CONSTRAINT "SmsTemplate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "BlockedDate_businessId_staffUserId_date_startMinute_endMinute_k" RENAME TO "BlockedDate_businessId_staffUserId_date_startMinute_endMinu_key";

-- RenameIndex
ALTER INDEX "Order_businessId_idempotencyOperation_idempotencyChannel_idempo" RENAME TO "Order_businessId_idempotencyOperation_idempotencyChannel_id_key";

-- RenameIndex
ALTER INDEX "OutboxEvent_businessId_aggregateType_aggregateId_eventType_idem" RENAME TO "OutboxEvent_businessId_aggregateType_aggregateId_eventType__key";

-- RenameIndex
ALTER INDEX "SellerInviteDelivery_businessId_status_nextRetryAt_createdAt_id" RENAME TO "SellerInviteDelivery_businessId_status_nextRetryAt_createdA_idx";

-- RenameIndex
ALTER INDEX "WorkingHours_businessId_staffUserId_weekday_startMinute_endMinu" RENAME TO "WorkingHours_businessId_staffUserId_weekday_startMinute_end_key";
