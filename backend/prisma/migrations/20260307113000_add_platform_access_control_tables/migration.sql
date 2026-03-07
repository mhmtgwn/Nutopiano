-- CreateTable
CREATE TABLE IF NOT EXISTS "PermissionGroup" (
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
CREATE TABLE IF NOT EXISTS "UserPermissionGroup" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "permissionGroupId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPermissionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "FeatureFlag" (
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
CREATE TABLE IF NOT EXISTS "UserTwoFactor" (
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
CREATE TABLE IF NOT EXISTS "ApiKey" (
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
CREATE TABLE IF NOT EXISTS "Notification" (
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
CREATE TABLE IF NOT EXISTS "ConfigSnapshot" (
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
CREATE TABLE IF NOT EXISTS "EmailTemplate" (
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
CREATE TABLE IF NOT EXISTS "SmsTemplate" (
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
CREATE UNIQUE INDEX IF NOT EXISTS "PermissionGroup_businessId_name_key" ON "PermissionGroup"("businessId", "name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PermissionGroup_businessId_idx" ON "PermissionGroup"("businessId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PermissionGroup_businessId_isActive_idx" ON "PermissionGroup"("businessId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "UserPermissionGroup_userId_permissionGroupId_key" ON "UserPermissionGroup"("userId", "permissionGroupId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserPermissionGroup_businessId_userId_idx" ON "UserPermissionGroup"("businessId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "FeatureFlag_key_businessId_key" ON "FeatureFlag"("key", "businessId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FeatureFlag_scope_isActive_idx" ON "FeatureFlag"("scope", "isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FeatureFlag_businessId_isActive_idx" ON "FeatureFlag"("businessId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "UserTwoFactor_userId_key" ON "UserTwoFactor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ApiKey_businessId_idx" ON "ApiKey"("businessId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ApiKey_businessId_sellerId_idx" ON "ApiKey"("businessId", "sellerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_businessId_isRead_createdAt_idx" ON "Notification"("businessId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_businessId_type_createdAt_idx" ON "Notification"("businessId", "type", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ConfigSnapshot_businessId_configType_configKey_idx" ON "ConfigSnapshot"("businessId", "configType", "configKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ConfigSnapshot_businessId_configType_version_idx" ON "ConfigSnapshot"("businessId", "configType", "version");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EmailTemplate_businessId_key_key" ON "EmailTemplate"("businessId", "key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmailTemplate_businessId_idx" ON "EmailTemplate"("businessId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmailTemplate_businessId_isActive_idx" ON "EmailTemplate"("businessId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SmsTemplate_businessId_key_key" ON "SmsTemplate"("businessId", "key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SmsTemplate_businessId_idx" ON "SmsTemplate"("businessId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SmsTemplate_businessId_isActive_idx" ON "SmsTemplate"("businessId", "isActive");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PermissionGroup_businessId_fkey') THEN
        ALTER TABLE "PermissionGroup"
        ADD CONSTRAINT "PermissionGroup_businessId_fkey"
        FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserPermissionGroup_businessId_fkey') THEN
        ALTER TABLE "UserPermissionGroup"
        ADD CONSTRAINT "UserPermissionGroup_businessId_fkey"
        FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserPermissionGroup_userId_fkey') THEN
        ALTER TABLE "UserPermissionGroup"
        ADD CONSTRAINT "UserPermissionGroup_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserPermissionGroup_permissionGroupId_fkey') THEN
        ALTER TABLE "UserPermissionGroup"
        ADD CONSTRAINT "UserPermissionGroup_permissionGroupId_fkey"
        FOREIGN KEY ("permissionGroupId") REFERENCES "PermissionGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FeatureFlag_businessId_fkey') THEN
        ALTER TABLE "FeatureFlag"
        ADD CONSTRAINT "FeatureFlag_businessId_fkey"
        FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserTwoFactor_userId_fkey') THEN
        ALTER TABLE "UserTwoFactor"
        ADD CONSTRAINT "UserTwoFactor_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ApiKey_businessId_fkey') THEN
        ALTER TABLE "ApiKey"
        ADD CONSTRAINT "ApiKey_businessId_fkey"
        FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_businessId_fkey') THEN
        ALTER TABLE "Notification"
        ADD CONSTRAINT "Notification_businessId_fkey"
        FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ConfigSnapshot_businessId_fkey') THEN
        ALTER TABLE "ConfigSnapshot"
        ADD CONSTRAINT "ConfigSnapshot_businessId_fkey"
        FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmailTemplate_businessId_fkey') THEN
        ALTER TABLE "EmailTemplate"
        ADD CONSTRAINT "EmailTemplate_businessId_fkey"
        FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SmsTemplate_businessId_fkey') THEN
        ALTER TABLE "SmsTemplate"
        ADD CONSTRAINT "SmsTemplate_businessId_fkey"
        FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
