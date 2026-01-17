import { prisma } from "@/lib/db";
import { ventureSnapshotService } from "@/lib/venture/VentureSnapshotService";
import {
    businessPlanSectionService,
    BUSINESS_PLAN_TEMPLATE_KEYS,
} from "@/lib/business-plan/BusinessPlanSectionService";
import { getAIProvider } from "@/lib/ai";
import { buildBusinessPlanPrompt, PROMPTSET_VERSION } from "@/lib/ai/registry/business-plan";

export type BusinessPlanGenerationResult = {
    message: string;
    latestSnapshotVersion: number;
    businessPlanId: string;
    successCount: number;
    failureCount: number;
};

const SECTION_TIMEOUT_MS = Number(process.env.BUSINESS_PLAN_SECTION_TIMEOUT_MS || "20000");

async function runWithTimeout<T>(promise: Promise<T>, timeoutMs: number) {
    let timeout: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
            reject(new Error("section_timeout"));
        }, timeoutMs);
    });
    const result = await Promise.race([promise, timeoutPromise]);
    if (timeout) {
        clearTimeout(timeout);
    }
    return result;
}

export async function runBusinessPlanGeneration(
    jobId: string,
    projectId: string
): Promise<BusinessPlanGenerationResult> {
    const now = new Date().toISOString();
    const isTest = process.env.NODE_ENV === "test";

    await prisma.job.update({
        where: { id: jobId },
        data: {
            progress: 10,
            result: { message: "Creating snapshot" },
        },
    });

    const { snapshot, businessPlan } = await ventureSnapshotService.createSnapshotWithSeed(
        projectId,
        true
    );

    await prisma.job.update({
        where: { id: jobId },
        data: {
            progress: 60,
            result: {
                message: "Populating sections",
                latestSnapshotVersion: snapshot.version,
                businessPlanId: businessPlan.id,
            },
        },
    });

    const provider = getAIProvider();
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, name: true, description: true },
    });

    let successCount = 0;
    let failureCount = 0;

    for (let index = 0; index < BUSINESS_PLAN_TEMPLATE_KEYS.length; index++) {
        const key = BUSINESS_PLAN_TEMPLATE_KEYS[index];
        const progress = 20 + Math.round(((index + 1) / BUSINESS_PLAN_TEMPLATE_KEYS.length) * 70);

        await prisma.job.update({
            where: { id: jobId },
            data: {
                progress,
                result: {
                    message: `Generating ${key} (${index + 1}/${BUSINESS_PLAN_TEMPLATE_KEYS.length})`,
                    latestSnapshotVersion: snapshot.version,
                    businessPlanId: businessPlan.id,
                },
            },
        });

        try {
            let text: string;
            if (isTest) {
                text = `Generated ${key}`;
            } else {
                const messages = buildBusinessPlanPrompt({
                    sectionKey: key,
                    projectName: project?.name ?? "",
                    projectDescription: project?.description ?? "",
                    snapshotVersion: snapshot.version,
                });
                const response = await runWithTimeout(
                    provider.complete({
                        messages,
                        model: process.env.BUSINESS_PLAN_MODEL || process.env.OPENAI_MODEL,
                        maxTokens: 800,
                        temperature: 0.4,
                    }),
                    SECTION_TIMEOUT_MS
                );
                text = response.content.trim();
            }

            await businessPlanSectionService.updateSection(businessPlan.id, key, {
                text,
                generatedAt: now,
                promptVersion: PROMPTSET_VERSION,
                model: isTest ? "MOCK" : provider.type,
            });
            successCount += 1;
        } catch (error) {
            failureCount += 1;
            await businessPlanSectionService.updateSection(businessPlan.id, key, {
                error: true,
                message: "generation_failed",
            });
        }
    }

    const result: BusinessPlanGenerationResult = {
        message: "Completed",
        latestSnapshotVersion: snapshot.version,
        businessPlanId: businessPlan.id,
        successCount,
        failureCount,
    };

    await prisma.job.update({
        where: { id: jobId },
        data: {
            progress: 100,
            result,
        },
    });

    return result;
}
