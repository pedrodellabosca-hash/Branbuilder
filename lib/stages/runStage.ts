/**
 * Centralized Stage Execution Service
 * 
 * Handles the full lifecycle of running a stage:
 * - Permission verification
 * - Idempotency (reuse existing job if active)
 * - AI generation with configured provider
 * - Zod validation of output
 * - Version creation with metadata
 * - Stage status update
 */

import { prisma } from "@/lib/db";
import { getAIProvider } from "@/lib/ai";
import { getStagePrompt } from "@/lib/prompts";
import { validateStageOutput, isValidStageKey } from "./schemas";
import { checkTokenBudget, recordUsage } from "@/lib/usage";
import { resolveEffectiveConfig, serializeConfig } from "@/lib/ai/resolve-config";
import type { PresetLevel } from "@/lib/ai/presets";
import type { EffectiveConfig } from "@/lib/ai/config";

// =============================================================================
// TYPES
// =============================================================================

export interface RunStageParams {
    projectId: string;
    stageKey: string;
    regenerate?: boolean;
    userId: string;
    orgId: string; // Clerk orgId
    // AI Configuration
    preset?: PresetLevel;
    provider?: string;
    model?: string;
    temperature?: number;
}

export interface RunStageResult {
    success: boolean;
    jobId: string;
    status: "QUEUED" | "PROCESSING" | "DONE" | "FAILED";
    idempotent?: boolean;
    outputId?: string;
    stageId?: string;
    error?: string;
    // Token info
    estimatedTokens?: number;
    remainingTokens?: number;
    tokenLimitReached?: boolean;
    suggestUpgrade?: boolean;
    // Config used
    preset?: PresetLevel;
    model?: string;
}

// Stage definitions for auto-creation
const STAGE_DEFINITIONS: Record<string, { name: string; module: "A" | "B"; order: number }> = {
    naming: { name: "Naming", module: "A", order: 1 },
    manifesto: { name: "Manifiesto de Marca", module: "A", order: 2 },
    voice: { name: "Voz de Marca", module: "A", order: 3 },
    tagline: { name: "Tagline", module: "A", order: 4 },
    palette: { name: "Paleta de Colores", module: "B", order: 5 },
    typography: { name: "Tipografía", module: "B", order: 6 },
    logo: { name: "Logo", module: "B", order: 7 },
    visual_identity: { name: "Identidad Visual", module: "B", order: 8 },
};

// =============================================================================
// MAIN FUNCTION
// =============================================================================

export async function runStage(params: RunStageParams): Promise<RunStageResult> {
    const { projectId, stageKey, regenerate = false, userId, orgId } = params;

    // Validate stageKey
    if (!isValidStageKey(stageKey) && !STAGE_DEFINITIONS[stageKey]) {
        return {
            success: false,
            jobId: "",
            status: "FAILED",
            error: `Invalid stageKey: ${stageKey}`,
        };
    }

    // Get org for multi-tenant validation
    const org = await prisma.organization.findUnique({
        where: { clerkOrgId: orgId },
    });

    if (!org) {
        return {
            success: false,
            jobId: "",
            status: "FAILED",
            error: "Organization not found",
        };
    }

    // Verify project belongs to org
    const project = await prisma.project.findFirst({
        where: {
            id: projectId,
            orgId: org.id,
        },
    });

    if (!project) {
        return {
            success: false,
            jobId: "",
            status: "FAILED",
            error: "Project not found",
        };
    }

    // Find or create stage
    let stage = await prisma.stage.findFirst({
        where: {
            projectId,
            stageKey,
        },
    });

    if (!stage) {
        const stageDef = STAGE_DEFINITIONS[stageKey];
        if (!stageDef) {
            return {
                success: false,
                jobId: "",
                status: "FAILED",
                error: `Unknown stageKey: ${stageKey}`,
            };
        }

        stage = await prisma.stage.create({
            data: {
                projectId,
                stageKey,
                name: stageDef.name,
                module: stageDef.module,
                order: stageDef.order,
                status: "NOT_STARTED",
            },
        });
    }

    // Idempotency: check for existing active job
    if (!regenerate) {
        const existingJob = await prisma.job.findFirst({
            where: {
                orgId: org.id,
                projectId,
                stage: stageKey,
                type: { in: ["GENERATE_OUTPUT", "REGENERATE_OUTPUT"] },
                status: { in: ["QUEUED", "PROCESSING"] },
            },
            orderBy: { createdAt: "desc" },
        });

        if (existingJob) {
            return {
                success: true,
                jobId: existingJob.id,
                status: existingJob.status as "QUEUED" | "PROCESSING",
                idempotent: true,
                stageId: stage.id,
            };
        }
    }

    // Resolve effective configuration
    const effectiveConfig = resolveEffectiveConfig({
        stageKey,
        preset: params.preset,
        provider: params.provider,
        model: params.model,
        temperature: params.temperature,
    });

    // Check token budget before proceeding
    const budget = await checkTokenBudget(org.id, effectiveConfig.estimatedTokens);

    if (!budget.allowed) {
        return {
            success: false,
            jobId: "",
            status: "FAILED",
            error: budget.suggestUpgrade
                ? "Monthly token limit reached. Upgrade to MID or PRO plan for more tokens."
                : "Monthly token limit reached. Purchase additional tokens to continue.",
            stageId: stage.id,
            tokenLimitReached: true,
            suggestUpgrade: budget.suggestUpgrade,
            remainingTokens: budget.remaining,
        };
    }

    // Find or create output
    let output = await prisma.output.findFirst({
        where: {
            projectId,
            stageId: stage.id,
        },
    });

    const isRegenerate = output !== null || regenerate;

    if (!output) {
        output = await prisma.output.create({
            data: {
                projectId,
                stageId: stage.id,
                name: `Output de ${stage.name}`,
                outputKey: `${stageKey}_output`,
            },
        });
    }

    // Create job
    const jobType = isRegenerate ? "REGENERATE_OUTPUT" : "GENERATE_OUTPUT";
    const job = await prisma.job.create({
        data: {
            orgId: org.id,
            projectId,
            module: stage.module,
            stage: stageKey,
            type: jobType,
            // Persist the effective configuration (Source of Truth)
            runConfig: serializeConfig(effectiveConfig) as any,
            payload: {
                stageId: stage.id,
                outputId: output.id,
                stageKey,
                projectName: project.name,
                userId,
                // Keep config in payload for redundancy/compatibility
                ...serializeConfig(effectiveConfig),
            },
        },
    });

    // Process job inline (dev mode) or return for async processing
    // For now, process inline
    try {
        await processStageJob(job.id, stage.id, output.id, stageKey, project.name, isRegenerate, userId, effectiveConfig);

        // Fetch updated job status
        const updatedJob = await prisma.job.findUnique({
            where: { id: job.id },
        });

        return {
            success: updatedJob?.status === "DONE",
            jobId: job.id,
            status: (updatedJob?.status as "QUEUED" | "PROCESSING" | "DONE" | "FAILED") || "FAILED",
            outputId: output.id,
            stageId: stage.id,
            error: updatedJob?.error || undefined,
            estimatedTokens: effectiveConfig.estimatedTokens,
            remainingTokens: budget.remaining - effectiveConfig.estimatedTokens,
            preset: effectiveConfig.preset,
            model: effectiveConfig.model,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return {
            success: false,
            jobId: job.id,
            status: "FAILED",
            error: errorMessage,
            stageId: stage.id,
        };
    }
}

// =============================================================================
// JOB PROCESSING
// =============================================================================

async function processStageJob(
    jobId: string,
    stageId: string,
    outputId: string,
    stageKey: string,
    projectName: string,
    isRegenerate: boolean,
    userId: string,
    effectiveConfig: EffectiveConfig
): Promise<void> {
    const startTime = Date.now();

    // Mark as processing
    await prisma.job.update({
        where: { id: jobId },
        data: {
            status: "PROCESSING",
            startedAt: new Date(),
        },
    });

    try {
        // Get stage for name
        const stage = await prisma.stage.findUnique({
            where: { id: stageId },
        });

        if (!stage) {
            throw new Error(`Stage ${stageId} not found`);
        }

        // Get prompt from registry
        const prompt = getStagePrompt(stageKey);
        console.log(`[runStage] Using prompt: ${prompt.id} v${prompt.version}`);
        console.log(`[runStage] Config: preset=${effectiveConfig.preset} provider=${effectiveConfig.provider} model=${effectiveConfig.model}`);

        // Build messages with context and preset config
        const messages = prompt.buildMessages({
            stageName: stage.name,
            stageKey,
            isRegenerate,
            projectName,
            // Pass preset config from effective config
            presetConfig: effectiveConfig.presetConfig
        });

        // Get AI provider and generate content
        const provider = getAIProvider();
        console.log(`[runStage] Calling AI provider: ${provider.type}`);

        const aiResponse = await provider.complete({
            messages,
            temperature: effectiveConfig.temperature || 0.7,
            maxTokens: effectiveConfig.resolvedMaxTokens,
        });

        const latencyMs = Date.now() - startTime;
        console.log(`[runStage] AI response received (${latencyMs}ms, ${aiResponse.usage?.totalTokens || 0} tokens)`);

        // Record actual token usage
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            select: { orgId: true, projectId: true },
        });

        if (job?.orgId && aiResponse.usage) {
            await recordUsage({
                orgId: job.orgId,
                projectId: job.projectId || undefined,
                stageKey,
                jobId,
                provider: provider.type,
                model: aiResponse.model,
                inputTokens: aiResponse.usage.promptTokens || 0,
                outputTokens: aiResponse.usage.completionTokens || 0,
            });
        }

        // Parse raw output
        const parsedRaw = prompt.parseOutput(aiResponse.content);

        // Validate with Zod schema
        let validatedData: unknown = null;
        let validationError: string | null = null;

        if (parsedRaw.ok && parsedRaw.data) {
            const validation = validateStageOutput(stageKey, parsedRaw.data);
            if (validation.ok) {
                validatedData = validation.data;
            } else {
                validationError = validation.error;
                console.warn(`[runStage] Zod validation failed: ${validationError}`);
            }
        } else {
            validationError = parsedRaw.error || "Failed to parse AI output";
        }

        // Get next version number
        const latestVersion = await prisma.outputVersion.findFirst({
            where: { outputId },
            orderBy: { version: "desc" },
        });
        const newVersionNumber = (latestVersion?.version || 0) + 1;

        // Create output version with full metadata
        await prisma.outputVersion.create({
            data: {
                outputId,
                version: newVersionNumber,
                content: validatedData || parsedRaw.data || { raw: aiResponse.content },
                provider: provider.type,
                model: aiResponse.model,
                promptSetVersion: `${prompt.id}@${prompt.version}`,
                generationParams: {
                    latencyMs,
                    tokensIn: aiResponse.usage?.promptTokens || 0,
                    tokensOut: aiResponse.usage?.completionTokens || 0,
                    totalTokens: aiResponse.usage?.totalTokens || 0,
                    validated: !validationError,
                    validationError: validationError || undefined,
                },
                createdBy: userId,
                type: "GENERATED",
                status: validationError ? "GENERATED" : "GENERATED", // Same status, error in metadata
            },
        });

        console.log(`[runStage] Created version ${newVersionNumber} for output ${outputId}`);

        // Update stage status
        const newStatus = isRegenerate ? "REGENERATED" : "GENERATED";
        await prisma.stage.update({
            where: { id: stageId },
            data: { status: newStatus },
        });

        // Mark job as done
        await prisma.job.update({
            where: { id: jobId },
            data: {
                status: "DONE",
                progress: 100,
                completedAt: new Date(),
                result: {
                    outputId,
                    versionNumber: newVersionNumber,
                    stageKey,
                    provider: provider.type,
                    latencyMs,
                    validated: !validationError,
                },
            },
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`[runStage] Job ${jobId} failed:`, errorMessage);

        await prisma.job.update({
            where: { id: jobId },
            data: {
                status: "FAILED",
                error: errorMessage,
                completedAt: new Date(),
            },
        });

        throw error;
    }
}
