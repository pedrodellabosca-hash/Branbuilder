-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('BASIC', 'MID', 'PRO');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID');

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "ProjectRole" AS ENUM ('PROJECT_OWNER', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('CREATED', 'IN_PROGRESS', 'COMPLETED', 'REOPENED', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "Module" AS ENUM ('A', 'B');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('ES', 'EN');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('GENERATE_OUTPUT', 'REGENERATE_OUTPUT', 'PROCESS_LIBRARY_FILE', 'BUILD_BRAND_PACK', 'BUILD_STRATEGY_PACK', 'BUILD_BRAND_MANUAL', 'BATCH_LOGOS', 'BATCH_MOCKUPS');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "StageStatus" AS ENUM ('NOT_STARTED', 'GENERATED', 'APPROVED', 'REGENERATED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "OutputType" AS ENUM ('GENERATED', 'EDITED');

-- CreateEnum
CREATE TYPE "OutputStatus" AS ENUM ('GENERATED', 'SELECTED', 'APPROVED', 'OBSOLETE');

-- CreateEnum
CREATE TYPE "LibraryFileStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'AVAILABLE', 'ERROR', 'DELETED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MENTION', 'COMMENT', 'STAGE_UPDATE', 'PROJECT_UPDATE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'MFA_ENABLED', 'MFA_DISABLED', 'ORG_CREATED', 'ORG_UPDATED', 'ORG_MEMBER_INVITED', 'ORG_MEMBER_REMOVED', 'ORG_ROLE_CHANGED', 'ORG_POLICY_UPDATED', 'PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_ARCHIVED', 'PROJECT_MEMBER_ADDED', 'PROJECT_MEMBER_REMOVED', 'PROJECT_ROLE_CHANGED', 'OUTPUT_GENERATED', 'OUTPUT_REGENERATED', 'OUTPUT_APPROVED', 'OUTPUT_EDITED', 'SUBSCRIPTION_CREATED', 'SUBSCRIPTION_UPDATED', 'SUBSCRIPTION_CANCELED', 'ADDON_PURCHASED', 'PAYMENT_FAILED', 'API_KEY_CREATED', 'API_KEY_ROTATED', 'API_KEY_REVOKED', 'SSO_CONFIGURED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "clerkOrgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'BASIC',
    "byoMode" BOOLEAN NOT NULL DEFAULT false,
    "stripeCustomerId" TEXT,
    "subscriptionId" TEXT,
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "mfaRequired" BOOLEAN NOT NULL DEFAULT false,
    "ssoRequired" BOOLEAN NOT NULL DEFAULT false,
    "ssoConnectionId" TEXT,
    "domainRestriction" TEXT,
    "ipAllowlist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sessionTimeout" INTEGER,
    "auditLevel" TEXT NOT NULL DEFAULT 'basic',
    "maxSeats" INTEGER NOT NULL DEFAULT 3,
    "maxStoragePerProject" BIGINT NOT NULL DEFAULT 1073741824,
    "maxProjects" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgMember" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',
    "invitedBy" TEXT,
    "invitedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "language" "Language" NOT NULL DEFAULT 'ES',
    "status" "ProjectStatus" NOT NULL DEFAULT 'CREATED',
    "moduleA" BOOLEAN NOT NULL DEFAULT false,
    "moduleB" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMember" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "ProjectRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandCoreProfile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "valueProposition" TEXT,
    "audience" JSONB,
    "positioning" TEXT,
    "tonePersonality" JSONB,
    "allowedClaims" TEXT[],
    "prohibitedClaims" TEXT[],
    "chosenName" TEXT,
    "restrictions" TEXT[],
    "objectives" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandCoreProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "module" "Module" NOT NULL,
    "stageKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "status" "StageStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "lockedBy" TEXT,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Output" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "outputKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Output_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutputVersion" (
    "id" TEXT NOT NULL,
    "outputId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "type" "OutputType" NOT NULL DEFAULT 'GENERATED',
    "status" "OutputStatus" NOT NULL DEFAULT 'GENERATED',
    "content" JSONB,
    "fileUrl" TEXT,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "thumbnailUrl" TEXT,
    "provider" TEXT,
    "model" TEXT,
    "promptSetVersion" TEXT,
    "generationParams" JSONB,
    "feedbackInput" TEXT,
    "elementsToKeep" TEXT[],
    "createdBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutputVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryFile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "status" "LibraryFileStatus" NOT NULL DEFAULT 'UPLOADED',
    "processingError" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectId" TEXT,
    "module" "Module",
    "stage" TEXT,
    "type" "JobType" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "result" JSONB,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "stageId" TEXT,
    "parentId" TEXT,
    "content" TEXT NOT NULL,
    "mentions" TEXT[],
    "authorId" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentReadReceipt" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentReadReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT,
    "projectId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "keyType" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "keyHint" TEXT NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT false,
    "lastValidated" TIMESTAMP(3),
    "validationError" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptSet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "module" "Module" NOT NULL,
    "stage" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "prompts" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "activatedBy" TEXT,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowSet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "module" "Module" NOT NULL,
    "version" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "workflow" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "activatedBy" TEXT,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "action" "AuditAction" NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "projectId" TEXT,
    "jobId" TEXT,
    "stripeMeterId" TEXT,
    "stripeMeterEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_clerkOrgId_key" ON "Organization"("clerkOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_stripeCustomerId_key" ON "Organization"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "OrgMember_orgId_idx" ON "OrgMember"("orgId");

-- CreateIndex
CREATE INDEX "OrgMember_userId_idx" ON "OrgMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgMember_orgId_userId_key" ON "OrgMember"("orgId", "userId");

-- CreateIndex
CREATE INDEX "Project_orgId_idx" ON "Project"("orgId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "ProjectMember_projectId_idx" ON "ProjectMember"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMember_userId_idx" ON "ProjectMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON "ProjectMember"("projectId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandCoreProfile_projectId_key" ON "BrandCoreProfile"("projectId");

-- CreateIndex
CREATE INDEX "Stage_projectId_idx" ON "Stage"("projectId");

-- CreateIndex
CREATE INDEX "Stage_projectId_module_idx" ON "Stage"("projectId", "module");

-- CreateIndex
CREATE UNIQUE INDEX "Stage_projectId_stageKey_key" ON "Stage"("projectId", "stageKey");

-- CreateIndex
CREATE INDEX "Output_projectId_idx" ON "Output"("projectId");

-- CreateIndex
CREATE INDEX "Output_stageId_idx" ON "Output"("stageId");

-- CreateIndex
CREATE UNIQUE INDEX "Output_projectId_stageId_outputKey_key" ON "Output"("projectId", "stageId", "outputKey");

-- CreateIndex
CREATE INDEX "OutputVersion_outputId_idx" ON "OutputVersion"("outputId");

-- CreateIndex
CREATE INDEX "OutputVersion_status_idx" ON "OutputVersion"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OutputVersion_outputId_version_key" ON "OutputVersion"("outputId", "version");

-- CreateIndex
CREATE INDEX "LibraryFile_projectId_idx" ON "LibraryFile"("projectId");

-- CreateIndex
CREATE INDEX "LibraryFile_status_idx" ON "LibraryFile"("status");

-- CreateIndex
CREATE INDEX "Job_status_createdAt_idx" ON "Job"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Job_orgId_idx" ON "Job"("orgId");

-- CreateIndex
CREATE INDEX "Job_projectId_idx" ON "Job"("projectId");

-- CreateIndex
CREATE INDEX "Comment_projectId_idx" ON "Comment"("projectId");

-- CreateIndex
CREATE INDEX "Comment_stageId_idx" ON "Comment"("stageId");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- CreateIndex
CREATE INDEX "CommentReadReceipt_userId_idx" ON "CommentReadReceipt"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CommentReadReceipt_commentId_userId_key" ON "CommentReadReceipt"("commentId", "userId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ApiKey_orgId_idx" ON "ApiKey"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_orgId_provider_keyType_key" ON "ApiKey"("orgId", "provider", "keyType");

-- CreateIndex
CREATE INDEX "PromptSet_module_stage_isActive_idx" ON "PromptSet"("module", "stage", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PromptSet_module_stage_version_key" ON "PromptSet"("module", "stage", "version");

-- CreateIndex
CREATE INDEX "WorkflowSet_module_isActive_idx" ON "WorkflowSet"("module", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowSet_module_version_key" ON "WorkflowSet"("module", "version");

-- CreateIndex
CREATE INDEX "AuditLog_orgId_createdAt_idx" ON "AuditLog"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "UsageRecord_orgId_createdAt_idx" ON "UsageRecord"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "UsageRecord_orgId_type_idx" ON "UsageRecord"("orgId", "type");

-- AddForeignKey
ALTER TABLE "OrgMember" ADD CONSTRAINT "OrgMember_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandCoreProfile" ADD CONSTRAINT "BrandCoreProfile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Output" ADD CONSTRAINT "Output_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Output" ADD CONSTRAINT "Output_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutputVersion" ADD CONSTRAINT "OutputVersion_outputId_fkey" FOREIGN KEY ("outputId") REFERENCES "Output"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryFile" ADD CONSTRAINT "LibraryFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentReadReceipt" ADD CONSTRAINT "CommentReadReceipt_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
