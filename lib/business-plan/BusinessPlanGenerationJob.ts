import { prisma } from "@/lib/db";
import { ventureSnapshotService } from "@/lib/venture/VentureSnapshotService";
import {
    businessPlanSectionService,
    BUSINESS_PLAN_TEMPLATE_KEYS,
} from "@/lib/business-plan/BusinessPlanSectionService";

export type BusinessPlanGenerationResult = {
    message: string;
    latestSnapshotVersion: number;
    businessPlanId: string;
};

export async function runBusinessPlanGeneration(
    jobId: string,
    projectId: string
): Promise<BusinessPlanGenerationResult> {
    const now = new Date().toISOString();

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

    const updates = BUSINESS_PLAN_TEMPLATE_KEYS.map((key) => ({
        key,
        content: {
            text: `Mock content for ${key} — ${now}`,
        },
    }));

    await businessPlanSectionService.updateSectionsBatch(businessPlan.id, updates);

    const result: BusinessPlanGenerationResult = {
        message: "Completed",
        latestSnapshotVersion: snapshot.version,
        businessPlanId: businessPlan.id,
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
