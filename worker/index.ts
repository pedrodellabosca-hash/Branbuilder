/**
 * BrandForge Background Worker
 * 
 * Procesa jobs de la cola DB-based.
 * Diseñado para correr en Render o similar.
 * 
 * Uso: npm run worker:start
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Job status constants
const JOB_STATUS = {
    QUEUED: "QUEUED",
    PROCESSING: "PROCESSING",
    DONE: "DONE",
    FAILED: "FAILED",
} as const;

// Job type constants
const JOB_TYPE = {
    GENERATE_OUTPUT: "GENERATE_OUTPUT",
    REGENERATE_OUTPUT: "REGENERATE_OUTPUT",
    PROCESS_LIBRARY_FILE: "PROCESS_LIBRARY_FILE",
    BUILD_BRAND_PACK: "BUILD_BRAND_PACK",
    BUILD_STRATEGY_PACK: "BUILD_STRATEGY_PACK",
    BUILD_BRAND_MANUAL: "BUILD_BRAND_MANUAL",
    BATCH_LOGOS: "BATCH_LOGOS",
    BATCH_MOCKUPS: "BATCH_MOCKUPS",
} as const;

// Types that REQUIRE projectId
const PROJECT_REQUIRED_TYPES = [
    "GENERATE_OUTPUT",
    "REGENERATE_OUTPUT",
    "BUILD_BRAND_PACK",
    "BUILD_STRATEGY_PACK",
    "BUILD_BRAND_MANUAL",
] as const;

type JobType = (typeof JOB_TYPE)[keyof typeof JOB_TYPE];

// Configuration from environment
const POLL_INTERVAL_MS = parseInt(process.env.WORKER_POLL_INTERVAL_MS || "5000", 10);
const BATCH_SIZE = parseInt(process.env.WORKER_BATCH_SIZE || "5", 10);
const WORKER_ID = process.env.WORKER_INSTANCE_ID || `worker-${Date.now()}`;

console.log(`[Worker] Starting with ID: ${WORKER_ID}`);
console.log(`[Worker] Poll interval: ${POLL_INTERVAL_MS}ms, Batch size: ${BATCH_SIZE}`);

// Full job interface with all needed fields
interface Job {
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
            await processJobs();
        } catch (error) {
            console.error("[Worker] Error in main loop:", error);
        }

        // Wait before next poll
        await sleep(POLL_INTERVAL_MS);
    }
}

/**
 * Fetch and process a batch of queued jobs
 */
async function processJobs(): Promise<void> {
    // Lock jobs for processing (transactional)
    const jobs = await prisma.$transaction(async (tx) => {
        // Find queued jobs
        const queuedJobs = await tx.job.findMany({
            where: {
                status: JOB_STATUS.QUEUED,
                lockedAt: null,
            },
            orderBy: { createdAt: "asc" },
            take: BATCH_SIZE,
        });

        if (queuedJobs.length === 0) {
            return [];
        }

        // Lock them
        const jobIds = queuedJobs.map((j: { id: string }) => j.id);
        await tx.job.updateMany({
            where: { id: { in: jobIds } },
            data: {
                status: JOB_STATUS.PROCESSING,
                lockedAt: new Date(),
                lockedBy: WORKER_ID,
                startedAt: new Date(),
            },
        });

        return queuedJobs;
    });

    if (jobs.length === 0) {
        return;
    }

    console.log(`[Worker] Processing ${jobs.length} jobs`);

    // Process each job
    for (const job of jobs) {
        await processJob(job as Job);
    }
}

/**
 * Process a single job
 */
async function processJob(job: Job): Promise<void> {
    console.log(`[Worker] Processing job ${job.id} of type ${job.type}, projectId=${job.projectId}`);

    try {
        // Validate required fields for certain job types
        const requiresProject = PROJECT_REQUIRED_TYPES.includes(
            job.type as (typeof PROJECT_REQUIRED_TYPES)[number]
        );

        if (requiresProject && !job.projectId) {
            throw new Error(`Missing projectId for job type ${job.type}`);
        }

        // Route to appropriate handler (pass FULL job context)
        const result = await handleJob(job);

        // Mark as done
        await prisma.job.update({
            where: { id: job.id },
            data: {
                status: JOB_STATUS.DONE,
                result: result as object,
                progress: 100,
                completedAt: new Date(),
                lockedAt: null,
                lockedBy: null,
            },
        });

        console.log(`[Worker] Job ${job.id} completed successfully`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`[Worker] Job ${job.id} failed:`, errorMessage);

        // Check if we should retry
        const newAttempts = job.attempts + 1;
        const shouldRetry = newAttempts < job.maxAttempts;

        await prisma.job.update({
            where: { id: job.id },
            data: {
                status: shouldRetry ? JOB_STATUS.QUEUED : JOB_STATUS.FAILED,
                error: errorMessage,
                attempts: newAttempts,
                lockedAt: null,
                lockedBy: null,
                completedAt: shouldRetry ? null : new Date(),
            },
        });

        if (shouldRetry) {
            console.log(`[Worker] Job ${job.id} will be retried (attempt ${newAttempts}/${job.maxAttempts})`);
        }
    }
}

/**
 * Handle job by type - now receives FULL job context
 */
async function handleJob(job: Job): Promise<object> {
    switch (job.type as JobType) {
        case JOB_TYPE.GENERATE_OUTPUT:
            return await handleGenerateOutput(job);

        case JOB_TYPE.REGENERATE_OUTPUT:
            return await handleRegenerateOutput(job);

        case JOB_TYPE.PROCESS_LIBRARY_FILE:
            return await handleProcessLibraryFile(job);

        case JOB_TYPE.BUILD_BRAND_PACK:
            return await handleBuildBrandPack(job);

        case JOB_TYPE.BUILD_STRATEGY_PACK:
            return await handleBuildStrategyPack(job);

        case JOB_TYPE.BUILD_BRAND_MANUAL:
            return await handleBuildBrandManual(job);

        case JOB_TYPE.BATCH_LOGOS:
            return await handleBatchLogos(job);

        case JOB_TYPE.BATCH_MOCKUPS:
            return await handleBatchMockups(job);

        default:
            throw new Error(`Unknown job type: ${job.type}`);
    }
}

/**
 * Handle GENERATE_OUTPUT job
 * Creates Output and OutputVersion, updates Stage status
 */
async function handleGenerateOutput(job: Job): Promise<object> {
    console.log("[Worker] handleGenerateOutput", { projectId: job.projectId, stage: job.stage });

    const payload = job.payload as { stageId?: string };
    const stageId = payload.stageId;

    if (!stageId) {
        throw new Error("Missing stageId in payload");
    }

    if (!job.projectId) {
        throw new Error("Missing projectId on job");
    }

    // Find the stage
    const stage = await prisma.stage.findFirst({
        where: {
            id: stageId,
            projectId: job.projectId,
        },
    });

    if (!stage) {
        throw new Error(`Stage ${stageId} not found for project ${job.projectId}`);
    }

    // Create the Output and initial version
    const output = await prisma.output.create({
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
                        content: `Contenido generado para etapa ${stage.stageKey}. (Demo - integrar IA aquí)`,
                    },
                    createdBy: "worker",
                    type: "GENERATED",
                    status: "GENERATED",
                },
            },
        },
        include: {
            versions: true,
        },
    });

    // Update stage status to GENERATED
    await prisma.stage.update({
        where: { id: stageId },
        data: { status: "GENERATED" },
    });

    console.log(`[Worker] Created output ${output.id} for stage ${stageId}`);

    return {
        success: true,
        outputId: output.id,
        stageId,
        status: "GENERATED",
    };
}

/**
 * Handle REGENERATE_OUTPUT job
 * Creates new OutputVersion, updates Stage status  
 */
async function handleRegenerateOutput(job: Job): Promise<object> {
    console.log("[Worker] handleRegenerateOutput", { projectId: job.projectId, stage: job.stage });

    const payload = job.payload as { stageId?: string };
    const stageId = payload.stageId;

    if (!stageId) {
        throw new Error("Missing stageId in payload");
    }

    if (!job.projectId) {
        throw new Error("Missing projectId on job");
    }

    // Find the stage
    const stage = await prisma.stage.findFirst({
        where: {
            id: stageId,
            projectId: job.projectId,
        },
    });

    if (!stage) {
        throw new Error(`Stage ${stageId} not found for project ${job.projectId}`);
    }

    // Find existing output or create new
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
        // No existing output, create one
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
                            regenerated: true,
                            generatedAt: new Date().toISOString(),
                            content: `Contenido regenerado para etapa ${stage.stageKey}. (Demo - integrar IA aquí)`,
                        },
                        createdBy: "worker",
                        type: "GENERATED",
                        status: "GENERATED",
                    },
                },
            },
            include: {
                versions: true,
            },
        });
    } else {
        // Create new version
        const latestVersion = output.versions[0]?.version || 0;
        await prisma.outputVersion.create({
            data: {
                outputId: output.id,
                version: latestVersion + 1,
                content: {
                    title: stage.name,
                    regenerated: true,
                    generatedAt: new Date().toISOString(),
                    content: `Contenido regenerado (v${latestVersion + 1}) para etapa ${stage.stageKey}. (Demo - integrar IA aquí)`,
                },
                createdBy: "worker",
                type: "GENERATED",
                status: "GENERATED",
            },
        });
    }

    // Update stage status to REGENERATED
    await prisma.stage.update({
        where: { id: stageId },
        data: { status: "REGENERATED" },
    });

    console.log(`[Worker] Regenerated output for stage ${stageId}`);

    return {
        success: true,
        outputId: output!.id,
        stageId,
        status: "REGENERATED",
    };
}

async function handleProcessLibraryFile(job: Job): Promise<object> {
    console.log("[Worker] handleProcessLibraryFile", job.payload);
    // TODO: Implement in T16
    await sleep(500);
    return { success: true, message: "File processed (mock)" };
}

async function handleBuildBrandPack(job: Job): Promise<object> {
    console.log("[Worker] handleBuildBrandPack", { projectId: job.projectId });
    // TODO: Implement in T26
    await sleep(2000);
    return { success: true, message: "Brand pack built (mock)" };
}

async function handleBuildStrategyPack(job: Job): Promise<object> {
    console.log("[Worker] handleBuildStrategyPack", { projectId: job.projectId });
    // TODO: Implement in T27
    await sleep(2000);
    return { success: true, message: "Strategy pack built (mock)" };
}

async function handleBuildBrandManual(job: Job): Promise<object> {
    console.log("[Worker] handleBuildBrandManual", { projectId: job.projectId });
    // TODO: Implement in T34
    await sleep(3000);
    return { success: true, message: "Brand manual built (mock)" };
}

async function handleBatchLogos(job: Job): Promise<object> {
    console.log("[Worker] handleBatchLogos", { projectId: job.projectId });
    // TODO: Implement in T24/T26
    await sleep(5000);
    return { success: true, message: "Logos generated (mock)" };
}

async function handleBatchMockups(job: Job): Promise<object> {
    console.log("[Worker] handleBatchMockups", { projectId: job.projectId });
    // TODO: Implement in T26
    await sleep(3000);
    return { success: true, message: "Mockups generated (mock)" };
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

// Start the worker
runWorker().catch(console.error);
