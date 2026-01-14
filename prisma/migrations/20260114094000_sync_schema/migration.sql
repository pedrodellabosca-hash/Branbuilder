-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('SUPERADMIN', 'SUPPORT', 'TECHNICAL');

-- CreateEnum
CREATE TYPE "ModelStatus" AS ENUM ('PENDING', 'APPROVED', 'DEPRECATED', 'REMOVED');

-- CreateEnum
CREATE TYPE "ModelChangeType" AS ENUM ('NEW_MODEL', 'DEPRECATED', 'REMOVED', 'METADATA_CHANGED');

-- AlterEnum
ALTER TYPE "Module" ADD VALUE 'V';

-- DropForeignKey
ALTER TABLE "WorkflowSetVersion" DROP CONSTRAINT "WorkflowSetVersion_workflowSetId_fkey";

-- DropIndex
DROP INDEX "PromptSet_key_scope_idx";

-- DropIndex
DROP INDEX "PromptSet_orgId_idx";

-- DropIndex
DROP INDEX "PromptSetVersion_checksum_idx";

-- DropIndex
DROP INDEX "PromptSetVersion_status_idx";

-- DropIndex
DROP INDEX "WorkflowSet_key_key";

-- DropIndex
DROP INDEX "WorkflowSet_key_scope_idx";

-- DropIndex
DROP INDEX "WorkflowSet_orgId_idx";

-- AlterTable
ALTER TABLE "OrganizationAIConfig" ADD COLUMN     "stageConfigs" JSONB;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "moduleVenture" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ProjectAIConfig" ADD COLUMN     "stageConfigs" JSONB;

-- AlterTable
ALTER TABLE "PromptSet" DROP COLUMN "scope",
ADD COLUMN     "module" "Module",
ADD COLUMN     "name" TEXT,
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "roleKey" TEXT NOT NULL,
ADD COLUMN     "stageKey" TEXT;

-- AlterTable
ALTER TABLE "PromptSetVersion" DROP COLUMN "checksum",
DROP COLUMN "createdByUserId",
DROP COLUMN "outputSchema",
DROP COLUMN "publishedAt",
DROP COLUMN "revokedAt",
DROP COLUMN "revokedByUserId",
DROP COLUMN "systemPrompt",
DROP COLUMN "userPromptTemplate",
DROP COLUMN "variablesSchema",
ADD COLUMN     "content" TEXT NOT NULL,
ADD COLUMN     "createdBy" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "WorkflowSet" DROP COLUMN "description",
DROP COLUMN "key",
DROP COLUMN "scope",
ADD COLUMN     "createdBy" TEXT NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "jsonDefinition" JSONB NOT NULL,
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "status" "RegistryStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "systemDefinition" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- DropTable
DROP TABLE "WorkflowSetVersion";

-- CreateTable
CREATE TABLE "SystemStaff" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "SystemRole" NOT NULL DEFAULT 'SUPPORT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelCatalog" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "modelKey" TEXT NOT NULL,
    "displayName" TEXT,
    "description" TEXT,
    "contextWindow" INTEGER NOT NULL DEFAULT 4096,
    "capabilities" JSONB,
    "metadata" JSONB,
    "status" "ModelStatus" NOT NULL DEFAULT 'PENDING',
    "costInput" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costOutput" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelChangeEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "modelKey" TEXT NOT NULL,
    "changeType" "ModelChangeType" NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "ModelChangeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageModelRecommendation" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "stageKey" TEXT NOT NULL,
    "recommendedModelKey" TEXT NOT NULL,
    "fallbackModelKey" TEXT,
    "recommendedModelId" TEXT NOT NULL,
    "fallbackModelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" TEXT,

    CONSTRAINT "StageModelRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemStaff_userId_key" ON "SystemStaff"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ModelCatalog_provider_modelKey_key" ON "ModelCatalog"("provider", "modelKey");

-- CreateIndex
CREATE UNIQUE INDEX "StageModelRecommendation_orgId_stageKey_key" ON "StageModelRecommendation"("orgId", "stageKey");

-- CreateIndex
CREATE INDEX "PromptSet_stageKey_roleKey_idx" ON "PromptSet"("stageKey", "roleKey");

-- CreateIndex
CREATE INDEX "WorkflowSet_orgId_projectId_idx" ON "WorkflowSet"("orgId", "projectId");

-- CreateIndex
CREATE INDEX "WorkflowSet_isActive_idx" ON "WorkflowSet"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowSet_orgId_projectId_version_key" ON "WorkflowSet"("orgId", "projectId", "version");

-- AddForeignKey
ALTER TABLE "StageModelRecommendation" ADD CONSTRAINT "StageModelRecommendation_recommendedModelId_fkey" FOREIGN KEY ("recommendedModelId") REFERENCES "ModelCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageModelRecommendation" ADD CONSTRAINT "StageModelRecommendation_fallbackModelId_fkey" FOREIGN KEY ("fallbackModelId") REFERENCES "ModelCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
