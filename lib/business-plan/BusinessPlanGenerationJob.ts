import { prisma } from "@/lib/db";
import { BusinessPlanSectionKey } from "@prisma/client";
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
    perSectionStatus: Record<string, "ok" | "error">;
};

const SECTION_TIMEOUT_MS = Number(process.env.BUSINESS_PLAN_SECTION_TIMEOUT_MS || "20000");
const MAX_SECTION_RETRIES = Number(process.env.BUSINESS_PLAN_SECTION_RETRIES || "2");
const BASE_RETRY_BACKOFF_MS = Number(process.env.BUSINESS_PLAN_RETRY_BASE_MS || "500");
const RETRY_JITTER_MS = Number(process.env.BUSINESS_PLAN_RETRY_JITTER_MS || "200");

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

function isRetryableError(error: unknown) {
    if (!(error instanceof Error)) {
        return false;
    }
    const message = error.message || "";
    if (message.includes("section_timeout")) {
        return true;
    }
    if (message.includes("OpenAI API error: 429")) {
        return true;
    }
    if (/OpenAI API error: 5\d\d/.test(message)) {
        return true;
    }
    return false;
}

async function delay(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runBusinessPlanGeneration(
    jobId: string,
    projectId: string
): Promise<BusinessPlanGenerationResult> {
    const now = new Date().toISOString();
    const isTest = process.env.NODE_ENV === "test";
    const jobRecord = await prisma.job.findUnique({
        where: { id: jobId },
        select: { payload: true },
    });
    const payload = jobRecord?.payload as { sectionKeys?: unknown } | null;
    const requestedSectionKeys: BusinessPlanSectionKey[] = Array.isArray(payload?.sectionKeys)
        ? payload.sectionKeys
              .map((key) => String(key))
              .filter(
                  (key): key is BusinessPlanSectionKey =>
                      BUSINESS_PLAN_TEMPLATE_KEYS.includes(
                          key as (typeof BUSINESS_PLAN_TEMPLATE_KEYS)[number]
                      )
              )
        : [];
    const sectionKeys: BusinessPlanSectionKey[] =
        requestedSectionKeys.length > 0 ? requestedSectionKeys : [...BUSINESS_PLAN_TEMPLATE_KEYS];

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

    if (requestedSectionKeys.length > 0 && snapshot.version > 1) {
        const previousSnapshot = await prisma.ventureSnapshot.findFirst({
            where: { projectId, version: snapshot.version - 1 },
            select: { id: true },
        });
        if (previousSnapshot) {
            const previousPlan = await prisma.businessPlan.findFirst({
                where: { sourceSnapshotId: previousSnapshot.id },
                include: { sections: { select: { key: true, content: true } } },
            });
            if (previousPlan) {
                await Promise.all(
                    previousPlan.sections.map((section) =>
                        prisma.businessPlanSection.update({
                            where: {
                                businessPlanId_key: {
                                    businessPlanId: businessPlan.id,
                                    key: section.key,
                                },
                            },
                            data: {
                                content: section.content ?? {},
                            },
                        })
                    )
                );
            }
        }
    }

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
    const perSectionStatus: Record<string, "ok" | "error"> = {};

    for (let index = 0; index < sectionKeys.length; index++) {
        const key = sectionKeys[index];
        const progress = 20 + Math.round(((index + 1) / sectionKeys.length) * 70);
        let retries = 0;
        let completed = false;

        while (!completed) {
            const retrySuffix =
                retries > 0 ? ` (retry ${retries}/${MAX_SECTION_RETRIES})` : "";

            await prisma.job.update({
                where: { id: jobId },
                data: {
                    progress,
                    result: {
                        message: `Generating ${key}${retrySuffix} (${index + 1}/${sectionKeys.length})`,
                        latestSnapshotVersion: snapshot.version,
                        businessPlanId: businessPlan.id,
                    },
                },
            });

            try {
                let text: string;
                if (
                    isTest &&
                    process.env.BUSINESS_PLAN_TEST_RETRY === "1" &&
                    key === BUSINESS_PLAN_TEMPLATE_KEYS[0] &&
                    retries === 0
                ) {
                    throw new Error("section_timeout");
                }

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
                perSectionStatus[key] = "ok";
                completed = true;
            } catch (error) {
                const retryable = isRetryableError(error);
                if (retryable && retries < MAX_SECTION_RETRIES) {
                    retries += 1;
                    const backoff =
                        BASE_RETRY_BACKOFF_MS * Math.pow(2, retries - 1) +
                        Math.floor(Math.random() * RETRY_JITTER_MS);
                    await delay(backoff);
                    continue;
                }
                failureCount += 1;
                perSectionStatus[key] = "error";
                await businessPlanSectionService.updateSection(businessPlan.id, key, {
                    error: true,
                    message: "generation_failed",
                });
                completed = true;
            }
        }
    }

    const result: BusinessPlanGenerationResult = {
        message: "Completed",
        latestSnapshotVersion: snapshot.version,
        businessPlanId: businessPlan.id,
        successCount,
        failureCount,
        perSectionStatus,
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
