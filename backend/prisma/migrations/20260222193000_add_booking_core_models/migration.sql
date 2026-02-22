-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateTable
CREATE TABLE "ServiceType" (
  "id" SERIAL NOT NULL,
  "businessId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "durationMinutes" INTEGER NOT NULL,
  "priceCents" INTEGER,
  "colorHex" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkingHours" (
  "id" SERIAL NOT NULL,
  "businessId" INTEGER NOT NULL,
  "staffUserId" INTEGER,
  "weekday" "Weekday" NOT NULL,
  "startMinute" INTEGER NOT NULL,
  "endMinute" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkingHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeSlot" (
  "id" SERIAL NOT NULL,
  "businessId" INTEGER NOT NULL,
  "staffUserId" INTEGER,
  "serviceTypeId" INTEGER,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "capacity" INTEGER NOT NULL DEFAULT 1,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TimeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedDate" (
  "id" SERIAL NOT NULL,
  "businessId" INTEGER NOT NULL,
  "staffUserId" INTEGER,
  "date" DATE NOT NULL,
  "startMinute" INTEGER,
  "endMinute" INTEGER,
  "isFullDay" BOOLEAN NOT NULL DEFAULT true,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BlockedDate_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Appointment"
  ADD COLUMN "serviceTypeId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "ServiceType_businessId_name_key" ON "ServiceType"("businessId", "name");

-- CreateIndex
CREATE INDEX "ServiceType_businessId_idx" ON "ServiceType"("businessId");

-- CreateIndex
CREATE INDEX "ServiceType_businessId_isActive_idx" ON "ServiceType"("businessId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "WorkingHours_businessId_staffUserId_weekday_startMinute_endMinute_key"
  ON "WorkingHours"("businessId", "staffUserId", "weekday", "startMinute", "endMinute");

-- CreateIndex
CREATE INDEX "WorkingHours_businessId_idx" ON "WorkingHours"("businessId");

-- CreateIndex
CREATE INDEX "WorkingHours_businessId_staffUserId_weekday_isActive_idx"
  ON "WorkingHours"("businessId", "staffUserId", "weekday", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TimeSlot_businessId_staffUserId_serviceTypeId_startAt_endAt_key"
  ON "TimeSlot"("businessId", "staffUserId", "serviceTypeId", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "TimeSlot_businessId_idx" ON "TimeSlot"("businessId");

-- CreateIndex
CREATE INDEX "TimeSlot_businessId_staffUserId_startAt_idx" ON "TimeSlot"("businessId", "staffUserId", "startAt");

-- CreateIndex
CREATE INDEX "TimeSlot_businessId_serviceTypeId_startAt_idx" ON "TimeSlot"("businessId", "serviceTypeId", "startAt");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedDate_businessId_staffUserId_date_startMinute_endMinute_key"
  ON "BlockedDate"("businessId", "staffUserId", "date", "startMinute", "endMinute");

-- CreateIndex
CREATE INDEX "BlockedDate_businessId_idx" ON "BlockedDate"("businessId");

-- CreateIndex
CREATE INDEX "BlockedDate_businessId_date_idx" ON "BlockedDate"("businessId", "date");

-- CreateIndex
CREATE INDEX "BlockedDate_businessId_staffUserId_date_idx" ON "BlockedDate"("businessId", "staffUserId", "date");

-- CreateIndex
CREATE INDEX "Appointment_businessId_serviceTypeId_startAt_idx"
  ON "Appointment"("businessId", "serviceTypeId", "startAt");

-- AddForeignKey
ALTER TABLE "ServiceType"
  ADD CONSTRAINT "ServiceType_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkingHours"
  ADD CONSTRAINT "WorkingHours_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkingHours"
  ADD CONSTRAINT "WorkingHours_staffUserId_fkey"
  FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeSlot"
  ADD CONSTRAINT "TimeSlot_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeSlot"
  ADD CONSTRAINT "TimeSlot_staffUserId_fkey"
  FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeSlot"
  ADD CONSTRAINT "TimeSlot_serviceTypeId_fkey"
  FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockedDate"
  ADD CONSTRAINT "BlockedDate_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockedDate"
  ADD CONSTRAINT "BlockedDate_staffUserId_fkey"
  FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_serviceTypeId_fkey"
  FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddConstraint
ALTER TABLE "WorkingHours"
  ADD CONSTRAINT "WorkingHours_valid_minutes_check"
  CHECK (
    "startMinute" >= 0
    AND "startMinute" < 1440
    AND "endMinute" > "startMinute"
    AND "endMinute" <= 1440
  );

-- AddConstraint
ALTER TABLE "TimeSlot"
  ADD CONSTRAINT "TimeSlot_valid_time_range_check"
  CHECK ("endAt" > "startAt");

-- AddConstraint
ALTER TABLE "TimeSlot"
  ADD CONSTRAINT "TimeSlot_capacity_positive_check"
  CHECK ("capacity" > 0);

-- AddConstraint
ALTER TABLE "BlockedDate"
  ADD CONSTRAINT "BlockedDate_valid_minutes_check"
  CHECK (
    (
      "startMinute" IS NULL
      AND "endMinute" IS NULL
    )
    OR (
      "startMinute" IS NOT NULL
      AND "endMinute" IS NOT NULL
      AND "startMinute" >= 0
      AND "startMinute" < 1440
      AND "endMinute" > "startMinute"
      AND "endMinute" <= 1440
    )
  );
