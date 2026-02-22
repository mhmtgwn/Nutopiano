CREATE TABLE "CashRegisterSession" (
  "id" SERIAL NOT NULL,
  "businessId" INTEGER NOT NULL,
  "openedByUserId" INTEGER NOT NULL,
  "closedByUserId" INTEGER,
  "openingCashCents" INTEGER NOT NULL,
  "closingCashCents" INTEGER,
  "openNote" TEXT,
  "closeNote" TEXT,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CashRegisterSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CashRegisterSession_businessId_openedAt_idx" ON "CashRegisterSession"("businessId", "openedAt");
CREATE INDEX "CashRegisterSession_businessId_closedAt_idx" ON "CashRegisterSession"("businessId", "closedAt");
CREATE INDEX "CashRegisterSession_openedByUserId_idx" ON "CashRegisterSession"("openedByUserId");
CREATE INDEX "CashRegisterSession_closedByUserId_idx" ON "CashRegisterSession"("closedByUserId");

CREATE UNIQUE INDEX "CashRegisterSession_businessId_active_idx"
  ON "CashRegisterSession"("businessId")
  WHERE "closedAt" IS NULL;

ALTER TABLE "CashRegisterSession"
  ADD CONSTRAINT "CashRegisterSession_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CashRegisterSession"
  ADD CONSTRAINT "CashRegisterSession_openedByUserId_fkey"
  FOREIGN KEY ("openedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CashRegisterSession"
  ADD CONSTRAINT "CashRegisterSession_closedByUserId_fkey"
  FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
