import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { ventureSnapshotService } from "@/lib/venture/VentureSnapshotService";
import { businessPlanSectionService, SectionConflictError, BUSINESS_PLAN_TEMPLATE_KEYS, SectionNotFoundError } from "@/lib/business-plan/BusinessPlanSectionService";
import { businessPlanService } from "@/lib/business-plan/BusinessPlanService";
import { businessPlanExportService } from "@/lib/business-plan/BusinessPlanExportService";
import { processJobSync } from "@/lib/jobs/processor";
import {
    enqueueBusinessPlanGenerationJob,
    BusinessPlanGenerationLockError,
    BusinessPlanGenerationRateLimitError,
} from "@/lib/business-plan/BusinessPlanGenerationQueue";

process.env.TZ = "UTC";

const TEST_PREFIX = "test_bp_stage1_fixed";
const SNAPSHOT_PATH = path.join(
    process.cwd(),
    "scripts",
    "tests",
    "business-plan",
    "__snapshots__",
    "stage1.json"
);

function sortKeys(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(sortKeys);
    }
    if (value && typeof value === "object") {
        const entries = Object.entries(value as Record<string, unknown>)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, val]) => [key, sortKeys(val)]);
        return Object.fromEntries(entries);
    }
    return value;
}

function stableStringify(value: unknown): string {
    return JSON.stringify(sortKeys(value), null, 2);
}

function getTextContent(content: unknown): string | null {
    if (!content || typeof content !== "object" || Array.isArray(content)) {
        return null;
    }
    const record = content as Record<string, unknown>;
    return typeof record.text === "string" ? record.text : null;
}

function assertSnapshot(actual: unknown) {
    const actualSerialized = stableStringify(actual);
    if (process.env.UPDATE_BP_STAGE1_SNAPSHOT === "1") {
        fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
        fs.writeFileSync(SNAPSHOT_PATH, `${actualSerialized}\n`, "utf8");
        console.log(`Snapshot updated: ${SNAPSHOT_PATH}`);
        return;
    }
    const expected = fs.readFileSync(SNAPSHOT_PATH, "utf8");
    if (expected.trim() !== actualSerialized.trim()) {
        throw new Error(
            [
                "Snapshot mismatch for Stage 1.",
                "Update scripts/tests/business-plan/__snapshots__/stage1.json if expected.",
                "--- Expected ---",
                expected.trim(),
                "--- Actual ---",
                actualSerialized.trim(),
            ].join("\n")
        );
    }
}

function guardEnvironment() {
    if (process.env.RUN_DB_TESTS !== "1") {
        console.error("Refusing to run: RUN_DB_TESTS must be '1'.");
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
    let rateProjectId: string | null = null;
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

        const rateProject = await prisma.project.create({
            data: {
                orgId: org.id,
                name: `${TEST_PREFIX}_rate_project`,
                description: "Business plan engine rate limit test",
                moduleVenture: true,
                status: "CREATED",
            },
        });
        rateProjectId = rateProject.id;

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

        const document = await businessPlanService.getDocument(businessPlanId, org.id);
        assert.ok(document, "Document should be returned");
        assert.equal(
            document.sections.length,
            BUSINESS_PLAN_TEMPLATE_KEYS.length,
            "Document sections should match template length"
        );
        assert.deepEqual(
            document.sections.map((section) => section.key),
            [...BUSINESS_PLAN_TEMPLATE_KEYS],
            "Document sections should follow template order"
        );
        assert.deepEqual(
            document.sections[0].content,
            { text: "v1" },
            "Document should reflect updated content"
        );

        const updatedSingle = await businessPlanSectionService.updateSection(
            businessPlanId,
            BUSINESS_PLAN_TEMPLATE_KEYS[1],
            { text: "updated single" }
        );
        assert.equal(
            getTextContent(updatedSingle.content),
            "updated single",
            "Single update should persist"
        );

        const batchUpdated = await businessPlanSectionService.updateSectionsBatch(businessPlanId, [
            { key: BUSINESS_PLAN_TEMPLATE_KEYS[2], content: { text: "batch one" } },
            { key: BUSINESS_PLAN_TEMPLATE_KEYS[3], content: { text: "batch two" } },
        ]);
        assert.equal(batchUpdated.length, 2, "Batch update should update two sections");

        try {
            await businessPlanSectionService.updateSectionsBatch(businessPlanId, [
                { key: BUSINESS_PLAN_TEMPLATE_KEYS[4], content: { text: "valid" } },
                { key: "INVALID_KEY" as typeof BUSINESS_PLAN_TEMPLATE_KEYS[number], content: { text: "invalid" } },
            ]);
            assert.fail("Expected SectionNotFoundError for invalid key");
        } catch (error) {
            assert.ok(
                error instanceof SectionNotFoundError,
                "Expected SectionNotFoundError on invalid batch update"
            );
        }

        const verifyBatch = await prisma.businessPlanSection.findFirst({
            where: {
                businessPlanId,
                key: BUSINESS_PLAN_TEMPLATE_KEYS[4],
            },
            select: { content: true },
        });
        assert.notEqual(
            getTextContent(verifyBatch?.content),
            "valid",
            "Invalid batch should not partially write updates"
        );

        const seededSnapshot = await ventureSnapshotService.createSnapshotWithSeed(
            project.id,
            true
        );
        const seededDocument = await businessPlanService.getDocument(
            seededSnapshot.businessPlan.id,
            org.id
        );
        assert.ok(seededDocument, "Seeded document should be returned");
        assert.deepEqual(
            seededDocument.sections.map((section) => section.key),
            [...BUSINESS_PLAN_TEMPLATE_KEYS],
            "Seeded document should include template keys"
        );

        const job = await prisma.job.create({
            data: {
                orgId: org.id,
                projectId: project.id,
                type: "BUSINESS_PLAN_GENERATE",
                payload: {},
            },
        });
        process.env.BUSINESS_PLAN_TEST_RETRY = "1";
        await processJobSync(job.id);
        delete process.env.BUSINESS_PLAN_TEST_RETRY;

        const completedJob = await prisma.job.findUnique({
            where: { id: job.id },
            select: { status: true, result: true },
        });
        assert.equal(completedJob?.status, "DONE", "Job should complete");
        const resultText = JSON.stringify(completedJob?.result ?? {});
        assert.ok(
            !resultText.toLowerCase().includes("prompt"),
            "Job result should not include prompt details"
        );

        const jobResult = completedJob?.result as {
            latestSnapshotVersion?: number;
            businessPlanId?: string;
            perSectionStatus?: Record<string, "ok" | "error">;
            successCount?: number;
            failureCount?: number;
        } | null;
        assert.ok(jobResult?.latestSnapshotVersion, "Job should include snapshot version");
        assert.ok(jobResult?.businessPlanId, "Job should include businessPlanId");
        assert.equal(
            jobResult?.perSectionStatus?.[BUSINESS_PLAN_TEMPLATE_KEYS[0]],
            "ok",
            "Job result should include per-section status"
        );

        const jobSection = await prisma.businessPlanSection.findFirst({
            where: {
                businessPlanId: jobResult?.businessPlanId,
                key: BUSINESS_PLAN_TEMPLATE_KEYS[0],
            },
            select: { content: true },
        });
        assert.ok(
            getTextContent(jobSection?.content) === `Generated ${BUSINESS_PLAN_TEMPLATE_KEYS[0]}`,
            "Job should populate deterministic mock content"
        );

        const pdfBuffer = await businessPlanExportService.exportPdf(document);
        assert.ok(pdfBuffer.length > 1500, "PDF buffer should be non-trivial");
        assert.equal(pdfBuffer.subarray(0, 4).toString(), "%PDF", "PDF magic header");

        const docxBuffer = await businessPlanExportService.exportDocx(document);
        assert.ok(docxBuffer.length > 1500, "DOCX buffer should be non-trivial");
        assert.equal(docxBuffer.subarray(0, 2).toString(), "PK", "DOCX zip header");

        const lockHold = prisma.$transaction(async (tx) => {
            const rows = await tx.$queryRaw<{ locked: boolean }[]>`
                SELECT pg_try_advisory_lock(hashtext(${org.id}), hashtext(${rateProject.id})) AS locked
            `;
            if (!rows[0]?.locked) {
                throw new Error("expected_lock_acquired");
            }

            await new Promise((resolve) => setTimeout(resolve, 800));

            await tx.$queryRaw<{ unlocked: boolean }[]>`
                SELECT (pg_advisory_unlock(hashtext(${org.id}), hashtext(${rateProject.id})))::bool AS unlocked
            `;
        });

        const lockAttempt = (async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            try {
                await enqueueBusinessPlanGenerationJob({
                    orgId: org.id,
                    projectId: rateProject.id,
                    requestedBy: "test-user",
                });
                assert.fail("Expected BusinessPlanGenerationLockError for locked project");
            } catch (error) {
                assert.ok(
                    error instanceof BusinessPlanGenerationLockError,
                    "Expected BusinessPlanGenerationLockError"
                );
            }
        })();

        await Promise.all([lockHold, lockAttempt]);

        process.env.BUSINESS_PLAN_GENERATE_LIMIT = "3";
        process.env.BUSINESS_PLAN_GENERATE_WINDOW_MINUTES = "60";

        for (let i = 0; i < 3; i++) {
            await prisma.job.create({
                data: {
                    orgId: org.id,
                    projectId: rateProject.id,
                    type: "BUSINESS_PLAN_GENERATE",
                    status: "DONE",
                    payload: { requestedBy: "test-user" },
                    createdAt: new Date(Date.now() - 10 * 60 * 1000),
                },
            });
        }

        try {
            await enqueueBusinessPlanGenerationJob({
                orgId: org.id,
                projectId: rateProject.id,
                requestedBy: "test-user",
            });
            assert.fail("Expected BusinessPlanGenerationRateLimitError");
        } catch (error) {
            assert.ok(
                error instanceof BusinessPlanGenerationRateLimitError,
                "Expected BusinessPlanGenerationRateLimitError"
            );
        }

        const diffSections = {
            added: [...(diff?.sections.added ?? [])].sort(),
            removed: [...(diff?.sections.removed ?? [])].sort(),
            unchanged: [...(diff?.sections.unchanged ?? [])].sort(),
            changed: [...(diff?.sections.changed ?? [])]
                .map((item) => ({
                    key: item.key,
                    fromContent: item.fromContent,
                    toContent: item.toContent,
                }))
                .sort((a, b) => a.key.localeCompare(b.key)),
        };

        const snapshot = {
            schemaVersion: 1,
            document: {
                sectionKeys: document.sections.map((section) => section.key),
                firstSection: document.sections[0]?.content ?? null,
            },
            diff: {
                fromVersion: diff?.fromVersion ?? null,
                toVersion: diff?.toVersion ?? null,
                dataChanged: diff?.snapshot.dataChanged ?? null,
                sections: diffSections,
            },
            job: {
                perSectionStatus: jobResult?.perSectionStatus ?? {},
                successCount: jobResult?.successCount ?? null,
                failureCount: jobResult?.failureCount ?? null,
                sampleText: getTextContent(jobSection?.content),
            },
            rateLimit: {
                limit: Number(process.env.BUSINESS_PLAN_GENERATE_LIMIT || "3"),
                windowMinutes: Number(process.env.BUSINESS_PLAN_GENERATE_WINDOW_MINUTES || "60"),
            },
        };

        assertSnapshot(snapshot);

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
