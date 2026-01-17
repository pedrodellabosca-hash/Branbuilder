/*
  Warnings:

  - A unique constraint covering the columns `[businessPlanId,key]` on the table `BusinessPlanSection` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[projectId,version]` on the table `VentureSnapshot` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `VentureSnapshot` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "VentureSnapshot" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "BusinessPlanSection_businessPlanId_key_key" ON "BusinessPlanSection"("businessPlanId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "VentureSnapshot_projectId_version_key" ON "VentureSnapshot"("projectId", "version");
