-- AlterTable
ALTER TABLE "OutboxEvent"
ADD COLUMN "idempotencyKey" TEXT,
ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "nextRetryAt" TIMESTAMP(3),
ADD COLUMN "processingStartedAt" TIMESTAMP(3),
ADD COLUMN "lastError" TEXT,
ADD COLUMN "deadLetteredAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "OutboxEvent_businessId_aggregateType_aggregateId_eventType_idempotencyKey_key"
ON "OutboxEvent"("businessId", "aggregateType", "aggregateId", "eventType", "idempotencyKey");

-- CreateIndex
CREATE INDEX "OutboxEvent_processedAt_deadLetteredAt_nextRetryAt_idx"
ON "OutboxEvent"("processedAt", "deadLetteredAt", "nextRetryAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_businessId_deadLetteredAt_createdAt_idx"
ON "OutboxEvent"("businessId", "deadLetteredAt", "createdAt");
