import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { BUSINESS_PLAN_TEMPLATE_KEYS } from "@/lib/business-plan/BusinessPlanSectionService";

type CreateBusinessPlanParams = {
    projectId: string;
    sourceSnapshotId: string;
    version: number;
};

export class BusinessPlanService {
    async createForSnapshot(
        tx: Prisma.TransactionClient,
        params: CreateBusinessPlanParams
    ) {
        const { projectId, sourceSnapshotId, version } = params;
        return tx.businessPlan.create({
            data: {
                projectId,
                sourceSnapshotId,
                version,
                status: "DRAFT",
            },
        });
    }

    async getBusinessPlanBySnapshotId(snapshotId: string) {
        return prisma.businessPlan.findFirst({
            where: { sourceSnapshotId: snapshotId },
            select: { id: true, projectId: true, sourceSnapshotId: true },
        });
    }

    async getBusinessPlanByIdAndOrgId(businessPlanId: string, orgId: string) {
        return prisma.businessPlan.findFirst({
            where: {
                id: businessPlanId,
                project: { orgId },
            },
            select: {
                id: true,
                projectId: true,
                sourceSnapshotId: true,
            },
        });
    }

    async getDocument(businessPlanId: string, orgId: string) {
        const plan = await prisma.businessPlan.findFirst({
            where: {
                id: businessPlanId,
                project: { orgId },
            },
            include: {
                sourceSnapshot: {
                    select: { version: true },
                },
                sections: {
                    select: { key: true, title: true, content: true },
                },
            },
        });

        if (!plan) {
            return null;
        }

        const sectionMap = new Map(
            plan.sections.map((section) => [
                section.key,
                {
                    key: section.key,
                    title: section.title,
                    content: section.content ?? {},
                },
            ])
        );

        const orderedSections = BUSINESS_PLAN_TEMPLATE_KEYS.map((key) => {
            const existing = sectionMap.get(key);
            if (existing) {
                return existing;
            }
            return {
                key,
                title: key,
                content: {},
            };
        });

        return {
            businessPlanId: plan.id,
            projectId: plan.projectId,
            ventureSnapshotId: plan.sourceSnapshotId,
            snapshotVersion: plan.sourceSnapshot.version,
            updatedAt: plan.updatedAt,
            sections: orderedSections,
        };
    }
}

export const businessPlanService = new BusinessPlanService();
