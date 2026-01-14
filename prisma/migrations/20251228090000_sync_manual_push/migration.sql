-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'ADDON_INTENT_CREATED';

-- AlterTable
ALTER TABLE "Output" ADD COLUMN     "orgId" TEXT;

-- AlterTable
ALTER TABLE "PromptSet" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "orgId" TEXT;

-- AlterTable
ALTER TABLE "Stage" ADD COLUMN     "orgId" TEXT;

-- AlterTable
ALTER TABLE "Usage" ADD COLUMN     "billedTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0;

-- AlterTable
ALTER TABLE "WorkflowSet" ADD COLUMN     "orgId" TEXT;

-- CreateTable
CREATE TABLE "OrganizationAIConfig" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'MOCK',
    "model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "preset" TEXT NOT NULL DEFAULT 'fast',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationAIConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenPurchase" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL,
    "priceUsdCents" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "TokenPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerHeartbeat" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" TEXT,

    CONSTRAINT "WorkerHeartbeat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationAIConfig_orgId_key" ON "OrganizationAIConfig"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "TokenPurchase_idempotencyKey_key" ON "TokenPurchase"("idempotencyKey");

-- CreateIndex
CREATE INDEX "TokenPurchase_orgId_status_idx" ON "TokenPurchase"("orgId", "status");

-- CreateIndex
CREATE INDEX "TokenPurchase_idempotencyKey_idx" ON "TokenPurchase"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerHeartbeat_workerId_key" ON "WorkerHeartbeat"("workerId");

-- AddForeignKey
ALTER TABLE "OrganizationAIConfig" ADD CONSTRAINT "OrganizationAIConfig_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenPurchase" ADD CONSTRAINT "TokenPurchase_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

