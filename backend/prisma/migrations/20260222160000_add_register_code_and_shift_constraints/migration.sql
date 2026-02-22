ALTER TABLE "CashRegisterSession"
  ADD COLUMN "registerCode" TEXT NOT NULL DEFAULT 'MAIN';

DROP INDEX IF EXISTS "CashRegisterSession_businessId_active_idx";

CREATE INDEX IF NOT EXISTS "CashRegisterSession_businessId_registerCode_openedAt_idx"
  ON "CashRegisterSession"("businessId", "registerCode", "openedAt");

CREATE UNIQUE INDEX "CashRegisterSession_businessId_registerCode_active_idx"
  ON "CashRegisterSession"("businessId", "registerCode")
  WHERE "closedAt" IS NULL;
