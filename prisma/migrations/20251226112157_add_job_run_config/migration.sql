-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "runConfig" JSONB;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "bonusTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "monthlyTokenLimit" INTEGER NOT NULL DEFAULT 100000,
ADD COLUMN     "monthlyTokensUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tokenResetDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Usage" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectId" TEXT,
    "stageKey" TEXT,
    "jobId" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "estimatedCostUsd" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanConfig" (
    "id" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "baseTokenLimit" INTEGER NOT NULL,
    "priceMonthlyUsd" INTEGER NOT NULL,
    "priceYearlyUsd" INTEGER NOT NULL,
    "tokenAddOnSize" INTEGER NOT NULL DEFAULT 500000,
    "tokenAddOnPriceUsd" INTEGER NOT NULL DEFAULT 1000,
    "canPurchaseTokens" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Usage_orgId_createdAt_idx" ON "Usage"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "Usage_orgId_stageKey_idx" ON "Usage"("orgId", "stageKey");

-- CreateIndex
CREATE UNIQUE INDEX "PlanConfig_plan_key" ON "PlanConfig"("plan");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usage" ADD CONSTRAINT "Usage_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
