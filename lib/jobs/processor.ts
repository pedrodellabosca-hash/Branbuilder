import { prisma } from "@/lib/db";
import { getAIProvider } from "@/lib/ai";
import { getStagePrompt } from "@/lib/prompts";
import { deserializeConfig } from "@/lib/ai/resolve-config";
import type { EffectiveConfig } from "@/lib/ai/config";
import { runBusinessPlanGeneration } from "@/lib/business-plan/BusinessPlanGenerationJob";

/**
 * Process a job synchronously (for dev mode or inline processing)
 * This mirrors the logic in worker/index.ts but runs inline
 */
export async function processJobSync(jobId: string): Promise<void> {
    console.log(`[JobProcessor] Processing job ${jobId} synchronously`);

    try {
        // Get the job
        const job = await prisma.job.findUnique({
            where: { id: jobId },
        });

        if (!job) {
            console.error(`[JobProcessor] Job ${jobId} not found`);
            return;
        }

        // Mark as processing
        await prisma.job.update({
            where: { id: jobId },
            data: {
                status: "PROCESSING",
                startedAt: new Date(),
            },
        });

        // Process based on type
        let result: object = { success: true };

        if (job.type === "GENERATE_OUTPUT" || job.type === "REGENERATE_OUTPUT") {
            result = await processGenerateOutput(job);
        } else if (job.type === "BUSINESS_PLAN_GENERATE") {
            if (!job.projectId) {
                throw new Error("Missing projectId on job");
            }
            result = await runBusinessPlanGeneration(job.id, job.projectId);
        } else {
            // Other job types - mock for now
            result = { success: true, message: `${job.type} processed (mock)` };
        }

        // Mark as done
        await prisma.job.update({
            where: { id: jobId },
            data: {
                status: "DONE",
                result: result as object,
                progress: 100,
                completedAt: new Date(),
            },
        });

        console.log(`[JobProcessor] Job ${jobId} completed successfully`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`[JobProcessor] Job ${jobId} failed:`, errorMessage);

        await prisma.job.update({
            where: { id: jobId },
            data: {
                status: "FAILED",
                error: errorMessage,
                completedAt: new Date(),
            },
        });
    }
}

interface JobData {
    id: string;
    type: string;
    projectId: string | null;
    payload: unknown;
}

async function processGenerateOutput(job: JobData): Promise<object> {
    const payload = job.payload as Record<string, unknown>;
    const stageId = payload.stageId as string | undefined;

    if (!stageId) {
        throw new Error("Missing stageId in payload");
    }

    if (!job.projectId) {
        throw new Error("Missing projectId on job");
    }

    // Find the stage with project for multi-tenant validation
    const stage = await prisma.stage.findFirst({
        where: {
            id: stageId,
            projectId: job.projectId,
        },
        include: {
            project: {
                select: { orgId: true, name: true },
            },
        },
    });

    if (!stage) {
        throw new Error(`Stage ${stageId} not found for project ${job.projectId}`);
    }

    console.log(`[JobProcessor] Generating content for stage ${stage.stageKey} (${stage.name})`);

    const isRegenerate = job.type === "REGENERATE_OUTPUT";

    // Fetch full job with runConfig from DB (Source of Truth)
    const fullJob = await prisma.job.findUnique({
        where: { id: job.id },
        select: { runConfig: true, payload: true }
    });

    // Restore effective config (Prioritize DB runConfig, fallback to payload)
    let runConfig: EffectiveConfig | null = null;
    try {
        if (fullJob?.runConfig) {
            runConfig = deserializeConfig(fullJob.runConfig as Record<string, unknown>);
            console.log(`[JobProcessor] Using persisted DB config: ${runConfig?.provider}/${runConfig?.model}`);
        } else {
            // Fallback to payload for older jobs
            runConfig = deserializeConfig(payload);
            if (runConfig) console.log(`[JobProcessor] Using payload config (fallback): ${runConfig.provider}/${runConfig.model}`);
        }
    } catch (e) {
        console.warn("[JobProcessor] Failed to deserialize config, using defaults", e);
    }

    // Get prompt from registry
    const prompt = getStagePrompt(stage.stageKey);
    console.log(`[JobProcessor] Using prompt: ${prompt.id} v${prompt.version}`);

    // Build messages with context AND preset config
    const messages = prompt.buildMessages({
        stageName: stage.name,
        stageKey: stage.stageKey,
        isRegenerate,
        projectName: stage.project.name,
        // Pass preset config if available
        presetConfig: runConfig?.presetConfig
    });

    // Get AI provider and generate content
    // Use provider from config if available, otherwise default
    const providerType = runConfig?.provider || "OPENAI";
    const provider = getAIProvider(providerType);
    console.log(`[JobProcessor] Calling AI provider: ${provider.type} (Model: ${runConfig?.model || "default"})`);

    const aiResponse = await provider.complete({
        messages,
        // Use params from config
        temperature: runConfig?.temperature || 0.7,
        maxTokens: runConfig?.resolvedMaxTokens, // Use the resolved limit from preset
        model: runConfig?.model || undefined, // Pass specific model if supported by provider wrapper
    });

    console.log(`[JobProcessor] AI response received (${aiResponse.usage?.totalTokens || 0} tokens)`);

    // Parse output using prompt's parser
    const parsed = prompt.parseOutput(aiResponse.content);

    if (!parsed.ok) {
        console.warn(`[JobProcessor] Parse warning for ${stage.stageKey}: ${parsed.error}`);
    }

    // Find or create output
    let output = await prisma.output.findFirst({
        where: {
            stageId,
            projectId: job.projectId,
        },
        include: {
            versions: {
                orderBy: { version: "desc" },
                take: 1,
            },
        },
    });

    // Build version content with metadata
    const versionContent = {
        // Prompt metadata
        promptId: prompt.id,
        promptVersion: prompt.version,

        // AI metadata
        aiProvider: provider.type,
        aiModel: aiResponse.model,
        tokens: aiResponse.usage?.totalTokens || 0,

        // Generation metadata
        stageKey: stage.stageKey,
        generated: true,
        regenerated: isRegenerate,
        generatedAt: new Date().toISOString(),

        // Content
        parsed: parsed.ok,
        rawContent: aiResponse.content,
        ...(parsed.ok && parsed.data ? parsed.data : {}),
    };

    if (!output) {
        // Create new output with first version
        output = await prisma.output.create({
            data: {
                projectId: job.projectId,
                stageId: stage.id,
                outputKey: `${stage.stageKey}_output_1`,
                name: `Output de ${stage.name}`,
                versions: {
                    create: {
                        version: 1,
                        content: versionContent,
                        createdBy: "system",
                        type: "GENERATED",
                        status: "GENERATED",
                    },
                },
            },
            include: {
                versions: true,
            },
        });
        console.log(`[JobProcessor] Created new output ${output.id} with version 1`);
    } else if (isRegenerate) {
        // Create new version
        const latestVersion = output.versions[0]?.version || 0;
        const newVersion = latestVersion + 1;
        await prisma.outputVersion.create({
            data: {
                outputId: output.id,
                version: newVersion,
                content: versionContent,
                createdBy: "system",
                type: "GENERATED",
                status: "GENERATED",
            },
        });
        console.log(`[JobProcessor] Created version ${newVersion} for output ${output.id}`);
    }

    // Update stage status
    const newStatus = isRegenerate ? "REGENERATED" : "GENERATED";
    await prisma.stage.update({
        where: { id: stageId },
        data: { status: newStatus },
    });

    console.log(`[JobProcessor] Stage ${stageId} status updated to ${newStatus}`);

    return {
        success: true,
        outputId: output.id,
        stageId,
        stageKey: stage.stageKey,
        status: newStatus,
        promptId: prompt.id,
        promptVersion: prompt.version,
        aiProvider: provider.type,
        tokens: aiResponse.usage?.totalTokens || 0,
        parsed: parsed.ok,
    };
}
