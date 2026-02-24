-- CreateEnum
CREATE TYPE "CommerceChannel" AS ENUM ('MARKETPLACE', 'POS', 'MANUAL');

-- CreateEnum
CREATE TYPE "CommissionRuleType" AS ENUM ('PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "RoundingMode" AS ENUM ('HALF_UP');

-- CreateTable
CREATE TABLE "CalculationProfile" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "taxInclusive" BOOLEAN NOT NULL DEFAULT true,
    "taxProfileCode" TEXT NOT NULL DEFAULT 'TR_STD',
    "roundingMode" "RoundingMode" NOT NULL DEFAULT 'HALF_UP',
    "discountRulesJson" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalculationProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionRule" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "calculationProfileId" INTEGER NOT NULL,
    "type" "CommissionRuleType" NOT NULL,
    "rateBps" INTEGER,
    "fixedAmountCents" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionCategoryOverride" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "commissionRuleId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "type" "CommissionRuleType" NOT NULL,
    "rateBps" INTEGER,
    "fixedAmountCents" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionCategoryOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerChannelRuleBinding" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "sellerId" INTEGER NOT NULL,
    "channel" "CommerceChannel" NOT NULL,
    "calculationProfileId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerChannelRuleBinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalculationProfile_businessId_code_key" ON "CalculationProfile"("businessId", "code");

-- CreateIndex
CREATE INDEX "CalculationProfile_businessId_idx" ON "CalculationProfile"("businessId");

-- CreateIndex
CREATE INDEX "CalculationProfile_businessId_isActive_idx" ON "CalculationProfile"("businessId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionRule_calculationProfileId_key" ON "CommissionRule"("calculationProfileId");

-- CreateIndex
CREATE INDEX "CommissionRule_businessId_idx" ON "CommissionRule"("businessId");

-- CreateIndex
CREATE INDEX "CommissionRule_businessId_isActive_idx" ON "CommissionRule"("businessId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionCategoryOverride_commissionRuleId_categoryId_key" ON "CommissionCategoryOverride"("commissionRuleId", "categoryId");

-- CreateIndex
CREATE INDEX "CommissionCategoryOverride_businessId_categoryId_idx" ON "CommissionCategoryOverride"("businessId", "categoryId");

-- CreateIndex
CREATE INDEX "CommissionCategoryOverride_businessId_isActive_idx" ON "CommissionCategoryOverride"("businessId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SellerChannelRuleBinding_businessId_sellerId_channel_key" ON "SellerChannelRuleBinding"("businessId", "sellerId", "channel");

-- CreateIndex
CREATE INDEX "SellerChannelRuleBinding_businessId_calculationProfileId_idx" ON "SellerChannelRuleBinding"("businessId", "calculationProfileId");

-- CreateIndex
CREATE INDEX "SellerChannelRuleBinding_businessId_channel_isActive_idx" ON "SellerChannelRuleBinding"("businessId", "channel", "isActive");

-- AddForeignKey
ALTER TABLE "CalculationProfile" ADD CONSTRAINT "CalculationProfile_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_calculationProfileId_fkey" FOREIGN KEY ("calculationProfileId") REFERENCES "CalculationProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionCategoryOverride" ADD CONSTRAINT "CommissionCategoryOverride_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionCategoryOverride" ADD CONSTRAINT "CommissionCategoryOverride_commissionRuleId_fkey" FOREIGN KEY ("commissionRuleId") REFERENCES "CommissionRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionCategoryOverride" ADD CONSTRAINT "CommissionCategoryOverride_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerChannelRuleBinding" ADD CONSTRAINT "SellerChannelRuleBinding_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerChannelRuleBinding" ADD CONSTRAINT "SellerChannelRuleBinding_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerChannelRuleBinding" ADD CONSTRAINT "SellerChannelRuleBinding_calculationProfileId_fkey" FOREIGN KEY ("calculationProfileId") REFERENCES "CalculationProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
