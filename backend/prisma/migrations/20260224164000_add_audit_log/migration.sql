-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "actorRole" "Role" NOT NULL,
    "actorUserId" INTEGER NOT NULL,
    "actionType" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_businessId_actionType_createdAt_idx" ON "AuditLog"("businessId", "actionType", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_businessId_actorUserId_createdAt_idx" ON "AuditLog"("businessId", "actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_businessId_targetType_targetId_createdAt_idx" ON "AuditLog"("businessId", "targetType", "targetId", "createdAt");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
