import { prisma } from "@/lib/db";
import { BusinessPlanService } from "@/lib/business-plan/BusinessPlanService";

export type VentureSnapshotData = {
    schemaVersion: 1;
    projectId: string;
    createdAt: string;
    inputs: Record<string, unknown>;
    derived: Record<string, unknown>;
};

export class VentureSnapshotService {
    private businessPlanService = new BusinessPlanService();

    async createSnapshot(projectId: string) {
        return prisma.$transaction(async (tx) => {
            const latest = await tx.ventureSnapshot.findFirst({
                where: { projectId },
                orderBy: { version: "desc" },
                select: { version: true },
            });

            const nextVersion = (latest?.version ?? 0) + 1;
            const now = new Date().toISOString();

            const data: VentureSnapshotData = {
                schemaVersion: 1,
                projectId,
                createdAt: now,
                inputs: {},
                derived: {},
            };

            const snapshot = await tx.ventureSnapshot.create({
                data: {
                    projectId,
                    version: nextVersion,
                    data,
                },
            });

            const businessPlan = await this.businessPlanService.createForSnapshot(tx, {
                projectId,
                sourceSnapshotId: snapshot.id,
                version: nextVersion,
            });

            return { snapshot, businessPlan };
        });
    }

    async listSnapshotsByProject(projectId: string) {
        return prisma.ventureSnapshot.findMany({
            where: { projectId },
            orderBy: { version: "asc" },
            select: {
                id: true,
                version: true,
                updatedAt: true,
                createdAt: true,
            },
        });
    }

    async getSnapshotByProjectAndVersion(projectId: string, version: number) {
        return prisma.ventureSnapshot.findFirst({
            where: { projectId, version },
        });
    }
}

export const ventureSnapshotService = new VentureSnapshotService();
