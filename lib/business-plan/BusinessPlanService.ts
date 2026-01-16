import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

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
}

export const businessPlanService = new BusinessPlanService();
