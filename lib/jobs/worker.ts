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

// Heartbeat interval (separate from poll)
const HEARTBEAT_MS = 10000;

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
    // Initial heartbeat
    await sendHeartbeat();

    // Schedule heartbeat loop
    setInterval(() => sendHeartbeat().catch(console.error), HEARTBEAT_MS);

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
        await executeJob(job as JobRecord);

        // Job is marked DONE by processStageJob usually, but we ensure lock release
        // We check if status was updated; if not, we mark it DONE. 
        // But processStageJob handles result writing. 
        // To be safe and clean, we only update lockedAt/lockedBy here if job is still PROCESSING.

        await prisma.job.updateMany({
            where: { id: job.id, status: "PROCESSING" },
            data: {
                status: "DONE", // Fallback if runner didn't update it
                progress: 100,
                completedAt: new Date(),
                lockedAt: null,
                lockedBy: null,
            },
        });

        // Always release lock if it wasn't caught above (e.g. status IS DONE)
        await prisma.job.updateMany({
            where: { id: job.id, lockedBy: WORKER_ID },
            data: {
                lockedAt: null,
                lockedBy: null
            }
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
async function executeJob(job: JobRecord): Promise<void> {
    switch (job.type) {
        case "GENERATE_OUTPUT":
        case "REGENERATE_OUTPUT":
            return await processGenerateOutput(job);

        case "PROCESS_LIBRARY_FILE":
            console.log("Mock processing file...");
            return;

        case "BUILD_BRAND_PACK":
        case "BUILD_STRATEGY_PACK":
        case "BUILD_BRAND_MANUAL":
        case "BATCH_LOGOS":
        case "BATCH_MOCKUPS":
            console.log(`Mock processing ${job.type}...`);
            return;

        default:
            throw new Error(`Unknown job type: ${job.type}`);
    }
}

/**
 * Process GENERATE_OUTPUT / REGENERATE_OUTPUT
 * Now delegates to the shared stage runner logic.
 */
async function processGenerateOutput(job: JobRecord): Promise<void> {
    const payload = job.payload as any;

    // Extract required params from payload
    const {
        stageId,
        outputId,
        stageKey,
        projectName,
        userId,
    } = payload;

    if (!stageId || !outputId || !stageKey || !projectName || !userId) {
        throw new Error(`Invalid payload for job ${job.id}: missing required fields`);
    }

    // Reconstruct effective config from job runConfig (Source of Truth)
    // We cast it because Prisma Json type assumes basic JSON, 
    // but we know it matches EffectiveConfig structure.
    const runConfig = (job as any).runConfig;

    if (!runConfig) {
        throw new Error(`Missing runConfig for job ${job.id}`);
    }

    // Import lazily to avoid circular dep issues if any (though unlikely here)
    const { processStageJob } = await import("@/lib/stages/runStage");

    // Delegate execution
    await processStageJob(
        job.id,
        stageId,
        outputId,
        stageKey,
        projectName,
        job.type === "REGENERATE_OUTPUT",
        userId,
        runConfig as any // EffectiveConfig
    );
}

// Utilities
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendHeartbeat() {
    await (prisma as any).workerHeartbeat.upsert({
        where: { workerId: WORKER_ID },
        create: {
            workerId: WORKER_ID,
            startedAt: new Date(),
            lastSeenAt: new Date(),
            version: process.env.GIT_SHA || null
        },
        update: {
            lastSeenAt: new Date()
        }
    });
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
