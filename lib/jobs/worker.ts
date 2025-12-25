/**
 * BrandForge Background Worker
 * 
 * Polls DB for QUEUED jobs and processes them asynchronously.
 * Use in production or when you want async job processing.
 * 
 * Usage: npm run worker
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Configuration
const POLL_INTERVAL_MS = parseInt(process.env.WORKER_POLL_INTERVAL_MS || "3000", 10);
const WORKER_ID = process.env.WORKER_ID || `worker-${Date.now()}`;

console.log(`[Worker] Starting with ID: ${WORKER_ID}`);
console.log(`[Worker] Poll interval: ${POLL_INTERVAL_MS}ms`);

interface JobRecord {
    id: string;
    type: string;
    payload: unknown;
    projectId: string | null;
    orgId: string;
    module: string | null;
    stage: string | null;
    attempts: number;
    maxAttempts: number;
}

/**
 * Main worker loop
 */
async function runWorker(): Promise<void> {
    while (true) {
        try {
            await processNextJob();
        } catch (error) {
            console.error("[Worker] Error in main loop:", error);
        }
        await sleep(POLL_INTERVAL_MS);
    }
}

/**
 * Fetch and process the next QUEUED job (FIFO by createdAt)
 */
async function processNextJob(): Promise<void> {
    // Atomic lock: find and update in one transaction
    const job = await prisma.$transaction(async (tx) => {
        // Find oldest QUEUED job
        const queuedJob = await tx.job.findFirst({
            where: {
                status: "QUEUED",
                lockedAt: null,
            },
            orderBy: { createdAt: "asc" },
        });

        if (!queuedJob) {
            return null;
        }

        // Lock it atomically (only if still QUEUED)
        const lockedJob = await tx.job.updateMany({
            where: {
                id: queuedJob.id,
                status: "QUEUED",
                lockedAt: null,
            },
            data: {
                status: "PROCESSING",
                lockedAt: new Date(),
                lockedBy: WORKER_ID,
                startedAt: new Date(),
            },
        });

        // If we locked it, return the job data
        if (lockedJob.count === 1) {
            return queuedJob;
        }
        return null;
    });

    if (!job) {
        return; // No jobs to process
    }

    console.log(`[Worker] Processing job ${job.id} (type=${job.type})`);

    try {
        const result = await executeJob(job as JobRecord);

        // Mark as DONE
        await prisma.job.update({
            where: { id: job.id },
            data: {
                status: "DONE",
                result: result as object,
                progress: 100,
                completedAt: new Date(),
                lockedAt: null,
                lockedBy: null,
            },
        });

        console.log(`[Worker] Job ${job.id} completed successfully`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Worker] Job ${job.id} failed:`, errorMessage);

        const newAttempts = job.attempts + 1;
        const shouldRetry = newAttempts < job.maxAttempts;

        await prisma.job.update({
            where: { id: job.id },
            data: {
                status: shouldRetry ? "QUEUED" : "FAILED",
                error: errorMessage,
                attempts: newAttempts,
                lockedAt: null,
                lockedBy: null,
                completedAt: shouldRetry ? null : new Date(),
            },
        });

        if (shouldRetry) {
            console.log(`[Worker] Job ${job.id} will retry (attempt ${newAttempts}/${job.maxAttempts})`);
        }
    }
}

/**
 * Execute job based on type
 */
async function executeJob(job: JobRecord): Promise<object> {
    switch (job.type) {
        case "GENERATE_OUTPUT":
        case "REGENERATE_OUTPUT":
            return await processGenerateOutput(job);

        case "PROCESS_LIBRARY_FILE":
            return { success: true, message: "File processed (mock)" };

        case "BUILD_BRAND_PACK":
        case "BUILD_STRATEGY_PACK":
        case "BUILD_BRAND_MANUAL":
        case "BATCH_LOGOS":
        case "BATCH_MOCKUPS":
            return { success: true, message: `${job.type} completed (mock)` };

        default:
            throw new Error(`Unknown job type: ${job.type}`);
    }
}

/**
 * Process GENERATE_OUTPUT / REGENERATE_OUTPUT
 */
async function processGenerateOutput(job: JobRecord): Promise<object> {
    const payload = job.payload as { stageId?: string };
    const stageId = payload.stageId;

    if (!stageId) {
        throw new Error("Missing stageId in payload");
    }

    if (!job.projectId) {
        throw new Error("Missing projectId on job");
    }

    // Find stage
    const stage = await prisma.stage.findFirst({
        where: {
            id: stageId,
            projectId: job.projectId,
        },
    });

    if (!stage) {
        throw new Error(`Stage ${stageId} not found for project ${job.projectId}`);
    }

    const isRegenerate = job.type === "REGENERATE_OUTPUT";

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
                        content: {
                            title: stage.name,
                            generated: true,
                            generatedAt: new Date().toISOString(),
                            content: `Contenido ${isRegenerate ? 're' : ''}generado para ${stage.stageKey}. (Integrar IA aquí)`,
                        },
                        createdBy: "worker",
                        type: "GENERATED",
                        status: "GENERATED",
                    },
                },
            },
            include: { versions: true },
        });
    } else if (isRegenerate) {
        const latestVersion = output.versions[0]?.version || 0;
        await prisma.outputVersion.create({
            data: {
                outputId: output.id,
                version: latestVersion + 1,
                content: {
                    title: stage.name,
                    regenerated: true,
                    generatedAt: new Date().toISOString(),
                    content: `Contenido regenerado (v${latestVersion + 1}) para ${stage.stageKey}. (Integrar IA aquí)`,
                },
                createdBy: "worker",
                type: "GENERATED",
                status: "GENERATED",
            },
        });
    }

    // Update stage status
    const newStatus = isRegenerate ? "REGENERATED" : "GENERATED";
    await prisma.stage.update({
        where: { id: stageId },
        data: { status: newStatus },
    });

    console.log(`[Worker] Output created for stage ${stageId}, status=${newStatus}`);

    return {
        success: true,
        outputId: output.id,
        stageId,
        status: newStatus,
    };
}

// Utilities
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Graceful shutdown
process.on("SIGTERM", async () => {
    console.log("[Worker] SIGTERM received, shutting down...");
    await prisma.$disconnect();
    process.exit(0);
});

process.on("SIGINT", async () => {
    console.log("[Worker] SIGINT received, shutting down...");
    await prisma.$disconnect();
    process.exit(0);
});

// Start
runWorker().catch(console.error);
