import { prisma } from "@/lib/db";

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
                            content: `Contenido ${isRegenerate ? 're' : ''}generado para etapa ${stage.stageKey}. (Demo - integrar IA aquí)`,
                        },
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
    } else if (isRegenerate) {
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
                createdBy: "system",
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

    console.log(`[JobProcessor] Created/updated output for stage ${stageId}, status=${newStatus}`);

    return {
        success: true,
        outputId: output.id,
        stageId,
        status: newStatus,
    };
}
