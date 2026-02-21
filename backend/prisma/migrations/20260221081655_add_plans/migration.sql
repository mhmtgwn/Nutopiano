-- CreateEnum
CREATE TYPE "PlanInterval" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "Plan" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "interval" "PlanInterval" NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Plan_businessId_idx" ON "Plan"("businessId");

-- CreateIndex
CREATE INDEX "Plan_businessId_interval_idx" ON "Plan"("businessId", "interval");

-- CreateIndex
CREATE INDEX "Plan_businessId_isActive_idx" ON "Plan"("businessId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_businessId_name_interval_key" ON "Plan"("businessId", "name", "interval");

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
