import { prisma } from "@/lib/db";
import { BusinessPlanService } from "@/lib/business-plan/BusinessPlanService";
import { BusinessPlanSectionService, SectionConflictError } from "@/lib/business-plan/BusinessPlanSectionService";

export type VentureSnapshotData = {
    schemaVersion: 1;
    projectId: string;
    createdAt: string;
    inputs: Record<string, unknown>;
    derived: Record<string, unknown>;
};

export class VentureSnapshotService {
    private businessPlanService = new BusinessPlanService();
    private sectionService = new BusinessPlanSectionService();

    async createSnapshot(projectId: string) {
        return this.createSnapshotWithSeed(projectId, false);
    }

    async createSnapshotWithSeed(projectId: string, seedTemplate: boolean) {
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

            if (seedTemplate) {
                await this.sectionService.seedTemplateWithTx(tx, businessPlan.id);
            }

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

    async compareSnapshots(projectId: string, fromVersion: number, toVersion: number) {
        const [fromSnapshot, toSnapshot] = await Promise.all([
            this.getSnapshotByProjectAndVersion(projectId, fromVersion),
            this.getSnapshotByProjectAndVersion(projectId, toVersion),
        ]);

        if (!fromSnapshot || !toSnapshot) {
            return null;
        }

        const [fromPlan, toPlan] = await Promise.all([
            prisma.businessPlan.findFirst({
                where: { sourceSnapshotId: fromSnapshot.id },
                include: { sections: { select: { key: true, content: true } } },
            }),
            prisma.businessPlan.findFirst({
                where: { sourceSnapshotId: toSnapshot.id },
                include: { sections: { select: { key: true, content: true } } },
            }),
        ]);

        const fromSections = new Map(
            (fromPlan?.sections ?? []).map((section) => [section.key, section.content ?? null])
        );
        const toSections = new Map(
            (toPlan?.sections ?? []).map((section) => [section.key, section.content ?? null])
        );

        const added: string[] = [];
        const removed: string[] = [];
        const changed: Array<{ key: string; fromContent: unknown; toContent: unknown }> = [];
        const unchanged: string[] = [];

        for (const key of toSections.keys()) {
            if (!fromSections.has(key)) {
                added.push(key);
            }
        }

        for (const key of fromSections.keys()) {
            if (!toSections.has(key)) {
                removed.push(key);
                continue;
            }
            const fromContent = fromSections.get(key);
            const toContent = toSections.get(key);
            const fromSerialized = JSON.stringify(fromContent);
            const toSerialized = JSON.stringify(toContent);
            if (fromSerialized === toSerialized) {
                unchanged.push(key);
            } else {
                changed.push({ key, fromContent, toContent });
            }
        }

        return {
            projectId,
            fromVersion,
            toVersion,
            snapshot: {
                dataChanged: JSON.stringify(fromSnapshot.data) !== JSON.stringify(toSnapshot.data),
            },
            sections: {
                added,
                removed,
                changed,
                unchanged,
            },
        };
    }
}

export const ventureSnapshotService = new VentureSnapshotService();
