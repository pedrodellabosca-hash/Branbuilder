import { prisma } from "@/lib/db";
import { getAIProvider, type AIMessage } from "@/lib/ai";

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

/**
 * Get placeholder prompt for a stage
 * PR3 will replace these with full prompts
 */
function getPromptForStage(stageKey: string, stageName: string, isRegenerate: boolean): AIMessage[] {
    const action = isRegenerate ? "regenera" : "genera";

    // Placeholder prompts by stage key (will be expanded in PR3)
    const stagePrompts: Record<string, string> = {
        // Module A - Brand Strategy
        naming: `${action} 3-5 opciones de naming para una marca. Incluye nombre y breve justificación para cada uno.`,
        manifesto: `${action} un manifiesto de marca de 100-150 palabras que capture la esencia y valores de la marca.`,
        voice: `${action} una guía de voz de marca definiendo tono, estilo y ejemplos de comunicación.`,
        tagline: `${action} 3-5 opciones de tagline/eslogan de máximo 8 palabras cada uno.`,

        // Module B - Visual Identity
        palette: `${action} una paleta de colores con 5 colores (primario, secundarios, acento). Incluye códigos HEX.`,
        typography: `${action} recomendaciones tipográficas: tipografía principal y secundaria con justificación.`,

        // Default
        default: `${action} contenido profesional para la etapa "${stageName}" de un proyecto de branding.`,
    };

    const userPrompt = stagePrompts[stageKey] || stagePrompts.default;

    return [
        {
            role: "system",
            content: "Eres un experto consultor de branding y estrategia de marca. Genera contenido profesional, creativo y estructurado. Responde en español. Usa formato JSON cuando sea apropiado para listas o estructuras.",
        },
        {
            role: "user",
            content: userPrompt,
        },
    ];
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

    // Find the stage with project for multi-tenant validation
    const stage = await prisma.stage.findFirst({
        where: {
            id: stageId,
            projectId: job.projectId,
        },
        include: {
            project: {
                select: { orgId: true },
            },
        },
    });

    if (!stage) {
        throw new Error(`Stage ${stageId} not found for project ${job.projectId}`);
    }

    console.log(`[JobProcessor] Generating content for stage ${stage.stageKey} (${stage.name})`);

    const isRegenerate = job.type === "REGENERATE_OUTPUT";

    // Get AI provider and generate content
    const provider = getAIProvider();
    const messages = getPromptForStage(stage.stageKey, stage.name, isRegenerate);

    console.log(`[JobProcessor] Calling AI provider: ${provider.type}`);
    const aiResponse = await provider.complete({
        messages,
        temperature: 0.7,
    });

    console.log(`[JobProcessor] AI response received (${aiResponse.usage?.totalTokens || 0} tokens)`);

    // Parse or use raw content
    let generatedContent: object;
    try {
        generatedContent = JSON.parse(aiResponse.content);
    } catch {
        // If not JSON, wrap in object
        generatedContent = { content: aiResponse.content };
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

    const versionContent = {
        title: stage.name,
        stageKey: stage.stageKey,
        generated: true,
        regenerated: isRegenerate,
        generatedAt: new Date().toISOString(),
        aiProvider: provider.type,
        aiModel: aiResponse.model,
        tokens: aiResponse.usage?.totalTokens || 0,
        ...generatedContent,
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
        aiProvider: provider.type,
        tokens: aiResponse.usage?.totalTokens || 0,
    };
}
