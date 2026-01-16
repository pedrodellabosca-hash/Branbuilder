/*
  Warnings:

  - The values [V] on the enum `Module` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `projectId` on the `PromptSet` table. All the data in the column will be lost.
  - You are about to drop the column `roleKey` on the `PromptSet` table. All the data in the column will be lost.
  - You are about to drop the column `stageKey` on the `PromptSet` table. All the data in the column will be lost.
  - You are about to drop the column `jsonDefinition` on the `WorkflowSet` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `WorkflowSet` table. All the data in the column will be lost.
  - You are about to drop the column `systemDefinition` on the `WorkflowSet` table. All the data in the column will be lost.
  - You are about to drop the `ModelCatalog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ModelChangeEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StageModelRecommendation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SystemStaff` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "BusinessPlanStatus" AS ENUM ('DRAFT', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BusinessPlanSectionKey" AS ENUM ('EXECUTIVE_SUMMARY', 'PROBLEM', 'SOLUTION', 'MARKET', 'COMPETITION', 'GO_TO_MARKET', 'OPERATIONS', 'FINANCIALS', 'RISKS');

-- CreateEnum
CREATE TYPE "BusinessPlanEventType" AS ENUM ('CREATED', 'SECTION_UPDATED', 'STATUS_CHANGED');

-- AlterEnum
BEGIN;
CREATE TYPE "Module_new" AS ENUM ('A', 'B');
ALTER TABLE "Stage" ALTER COLUMN "module" TYPE "Module_new" USING ("module"::text::"Module_new");
ALTER TABLE "Job" ALTER COLUMN "module" TYPE "Module_new" USING ("module"::text::"Module_new");
ALTER TABLE "PromptSet" ALTER COLUMN "module" TYPE "Module_new" USING ("module"::text::"Module_new");
ALTER TABLE "WorkflowSet" ALTER COLUMN "module" TYPE "Module_new" USING ("module"::text::"Module_new");
ALTER TYPE "Module" RENAME TO "Module_old";
ALTER TYPE "Module_new" RENAME TO "Module";
DROP TYPE "public"."Module_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "StageModelRecommendation" DROP CONSTRAINT "StageModelRecommendation_fallbackModelId_fkey";

-- DropForeignKey
ALTER TABLE "StageModelRecommendation" DROP CONSTRAINT "StageModelRecommendation_recommendedModelId_fkey";

-- DropIndex
DROP INDEX "PromptSet_stageKey_roleKey_idx";

-- DropIndex
DROP INDEX "WorkflowSet_isActive_idx";

-- AlterTable
ALTER TABLE "PromptSet" DROP COLUMN "projectId",
DROP COLUMN "roleKey",
DROP COLUMN "stageKey";

-- AlterTable
ALTER TABLE "WorkflowSet" DROP COLUMN "jsonDefinition",
DROP COLUMN "projectId",
DROP COLUMN "systemDefinition";

-- DropTable
DROP TABLE "ModelCatalog";

-- DropTable
DROP TABLE "ModelChangeEvent";

-- DropTable
DROP TABLE "StageModelRecommendation";

-- DropTable
DROP TABLE "SystemStaff";

-- DropEnum
DROP TYPE "ModelChangeType";

-- DropEnum
DROP TYPE "ModelStatus";

-- DropEnum
DROP TYPE "SystemRole";

-- CreateTable
CREATE TABLE "VentureSnapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VentureSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessPlan" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceSnapshotId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "BusinessPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessPlanSection" (
    "id" TEXT NOT NULL,
    "businessPlanId" TEXT NOT NULL,
    "key" "BusinessPlanSectionKey" NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessPlanSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessPlanEvent" (
    "id" TEXT NOT NULL,
    "businessPlanId" TEXT NOT NULL,
    "type" "BusinessPlanEventType" NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessPlanEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VentureSnapshot_projectId_idx" ON "VentureSnapshot"("projectId");

-- CreateIndex
CREATE INDEX "BusinessPlan_projectId_idx" ON "BusinessPlan"("projectId");

-- CreateIndex
CREATE INDEX "BusinessPlan_sourceSnapshotId_idx" ON "BusinessPlan"("sourceSnapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessPlan_projectId_version_key" ON "BusinessPlan"("projectId", "version");

-- CreateIndex
CREATE INDEX "BusinessPlanSection_businessPlanId_idx" ON "BusinessPlanSection"("businessPlanId");

-- CreateIndex
CREATE INDEX "BusinessPlanSection_key_idx" ON "BusinessPlanSection"("key");

-- CreateIndex
CREATE INDEX "BusinessPlanEvent_businessPlanId_idx" ON "BusinessPlanEvent"("businessPlanId");

-- CreateIndex
CREATE INDEX "BusinessPlanEvent_type_idx" ON "BusinessPlanEvent"("type");

-- AddForeignKey
ALTER TABLE "VentureSnapshot" ADD CONSTRAINT "VentureSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessPlan" ADD CONSTRAINT "BusinessPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessPlan" ADD CONSTRAINT "BusinessPlan_sourceSnapshotId_fkey" FOREIGN KEY ("sourceSnapshotId") REFERENCES "VentureSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessPlanSection" ADD CONSTRAINT "BusinessPlanSection_businessPlanId_fkey" FOREIGN KEY ("businessPlanId") REFERENCES "BusinessPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessPlanEvent" ADD CONSTRAINT "BusinessPlanEvent_businessPlanId_fkey" FOREIGN KEY ("businessPlanId") REFERENCES "BusinessPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
