import assert from "node:assert/strict";
import { prisma } from "@/lib/db";
import { ventureSnapshotService } from "@/lib/venture/VentureSnapshotService";
import { businessPlanSectionService, SectionConflictError, BUSINESS_PLAN_TEMPLATE_KEYS } from "@/lib/business-plan/BusinessPlanSectionService";

const TEST_PREFIX = `test_bp_stage1_${Date.now()}`;

function guardEnvironment() {
    if (process.env.NODE_ENV !== "test" && process.env.RUN_DB_TESTS !== "1") {
        console.error("Refusing to run: NODE_ENV must be 'test' or RUN_DB_TESTS=1.");
        process.exit(1);
    }
    const databaseUrl = process.env.DATABASE_URL || "";
    const isLocal = databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");
    const isTestDb = databaseUrl.toLowerCase().includes("_test");
    if (!isLocal || !isTestDb) {
        console.error(
            "Refusing to run: DATABASE_URL must point to a local test database (localhost/127.0.0.1 and include _test)."
        );
        process.exit(1);
    }
}

async function main() {
    guardEnvironment();

    let orgId: string | null = null;
    let projectId: string | null = null;
    let businessPlanId: string | null = null;

    try {
        const org = await prisma.organization.create({
            data: {
                clerkOrgId: `${TEST_PREFIX}_org`,
                name: `${TEST_PREFIX}_org`,
                slug: `${TEST_PREFIX}_org`,
            },
        });
        orgId = org.id;

        const project = await prisma.project.create({
            data: {
                orgId: org.id,
                name: `${TEST_PREFIX}_project`,
                description: "Business plan engine stage 1 test",
                moduleVenture: true,
                status: "CREATED",
            },
        });
        projectId = project.id;

        const first = await ventureSnapshotService.createSnapshot(project.id);
        assert.equal(first.snapshot.version, 1, "First snapshot should have version 1");
        assert.equal(
            first.businessPlan.sourceSnapshotId,
            first.snapshot.id,
            "BusinessPlan should link to snapshot"
        );
        businessPlanId = first.businessPlan.id;

        const second = await ventureSnapshotService.createSnapshot(project.id);
        assert.equal(second.snapshot.version, 2, "Second snapshot should have version 2");
        assert.equal(
            second.businessPlan.sourceSnapshotId,
            second.snapshot.id,
            "Second BusinessPlan should link to snapshot"
        );

        const seeded = await businessPlanSectionService.seedTemplate(businessPlanId);
        assert.equal(
            seeded.length,
            BUSINESS_PLAN_TEMPLATE_KEYS.length,
            "Seeded section count should match template"
        );

        await prisma.businessPlanSection.update({
            where: {
                businessPlanId_key: {
                    businessPlanId,
                    key: BUSINESS_PLAN_TEMPLATE_KEYS[0],
                },
            },
            data: {
                content: { text: "v1" },
            },
        });

        try {
            await businessPlanSectionService.seedTemplate(businessPlanId);
            assert.fail("Expected SectionConflictError on duplicate seed");
        } catch (error) {
            assert.ok(
                error instanceof SectionConflictError,
                "Expected SectionConflictError on duplicate seed"
            );
        }

        const sectionCount = await prisma.businessPlanSection.count({
            where: { businessPlanId },
        });
        assert.equal(
            sectionCount,
            BUSINESS_PLAN_TEMPLATE_KEYS.length,
            "Duplicate seed should not partially write any sections"
        );

        const secondBusinessPlanId = second.businessPlan.id;
        await businessPlanSectionService.seedTemplate(secondBusinessPlanId);
        await prisma.businessPlanSection.update({
            where: {
                businessPlanId_key: {
                    businessPlanId: secondBusinessPlanId,
                    key: BUSINESS_PLAN_TEMPLATE_KEYS[0],
                },
            },
            data: {
                content: { text: "v2" },
            },
        });

        const diff = await ventureSnapshotService.compareSnapshots(
            project.id,
            first.snapshot.version,
            second.snapshot.version
        );
        assert.ok(diff, "Snapshot diff should be returned");
        assert.ok(
            diff.sections.changed.some((item) => item.key === BUSINESS_PLAN_TEMPLATE_KEYS[0]),
            "Changed should include the modified key"
        );
        assert.ok(
            diff.sections.unchanged.length > 0,
            "Unchanged should include at least one key"
        );

        console.log("Business Plan Engine Stage 1 tests: OK");
    } finally {
        if (projectId) {
            await prisma.project.delete({
                where: { id: projectId },
            });
        }
        if (orgId) {
            await prisma.organization.delete({
                where: { id: orgId },
            });
        }
        await prisma.$disconnect();
    }
}

main().catch((error) => {
    console.error("Business Plan Engine Stage 1 tests failed:", error);
    process.exit(1);
});
