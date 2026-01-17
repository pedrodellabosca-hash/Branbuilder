import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { ventureSnapshotService } from "@/lib/venture/VentureSnapshotService";
import {
    businessPlanSectionService,
    BUSINESS_PLAN_TEMPLATE_KEYS,
} from "@/lib/business-plan/BusinessPlanSectionService";
import { businessPlanService } from "@/lib/business-plan/BusinessPlanService";
import { processJobSync } from "@/lib/jobs/processor";
import { enqueueBusinessPlanGenerationJob } from "@/lib/business-plan/BusinessPlanGenerationQueue";

process.env.TZ = "UTC";

const TEST_PREFIX = "test_bp_stage3_fixed";
const SNAPSHOT_PATH = path.join(
    process.cwd(),
    "scripts",
    "tests",
    "business-plan",
    "__snapshots__",
    "stage3.json"
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

function assertSnapshot(actual: unknown) {
    const actualSerialized = stableStringify(actual);
    if (process.env.UPDATE_BP_STAGE3_SNAPSHOT === "1") {
        fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
        fs.writeFileSync(SNAPSHOT_PATH, `${actualSerialized}\n`, "utf8");
        console.log(`Snapshot updated: ${SNAPSHOT_PATH}`);
        return;
    }
    if (!fs.existsSync(SNAPSHOT_PATH)) {
        throw new Error(
            "Stage 3 snapshot missing. Run: npm run test:business-plan:stage3:update-snapshot"
        );
    }
    const expected = fs.readFileSync(SNAPSHOT_PATH, "utf8");
    if (expected.trim() !== actualSerialized.trim()) {
        throw new Error(
            [
                "Snapshot mismatch for Stage 3.",
                "Update scripts/tests/business-plan/__snapshots__/stage3.json if expected.",
                "--- Expected ---",
                expected.trim(),
                "--- Actual ---",
                actualSerialized.trim(),
            ].join("\n")
        );
    }
}

function normalizeContent(content: unknown) {
    if (!content || typeof content !== "object") {
        return content;
    }
    const {
        generatedAt: _generatedAt,
        promptVersion: _promptVersion,
        model: _model,
        ...rest
    } = content as Record<string, unknown>;
    return rest;
}

async function pollJob(jobId: string, timeoutMs: number) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            select: { status: true, result: true },
        });
        if (job && (job.status === "DONE" || job.status === "FAILED")) {
            return job;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error("Job did not complete within timeout");
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
                description: "Business plan engine stage 3 test",
                moduleVenture: true,
                status: "CREATED",
            },
        });
        projectId = project.id;

        const first = await ventureSnapshotService.createSnapshotWithSeed(project.id, true);
        const targetKey = BUSINESS_PLAN_TEMPLATE_KEYS[0];

        for (const key of BUSINESS_PLAN_TEMPLATE_KEYS) {
            const content =
                key === targetKey ? { text: "baseline" } : { text: `Generated ${key}` };
            await businessPlanSectionService.updateSection(first.businessPlan.id, key, content);
        }

        const queuedJob = await enqueueBusinessPlanGenerationJob({
            orgId: org.id,
            projectId: project.id,
            requestedBy: "test",
            sectionKeys: [targetKey],
        });
        await processJobSync(queuedJob.id);

        const completedJob = await pollJob(queuedJob.id, 60_000);
        assert.equal(completedJob?.status, "DONE", "Job should complete");
        const jobResult = completedJob?.result as {
            latestSnapshotVersion?: number;
            businessPlanId?: string;
            perSectionStatus?: Record<string, "ok" | "error">;
            successCount?: number;
            failureCount?: number;
        } | null;
        assert.ok(jobResult?.latestSnapshotVersion, "Job should include snapshot version");
        assert.ok(jobResult?.businessPlanId, "Job should include businessPlanId");
        const latestSnapshotVersion = jobResult.latestSnapshotVersion;
        const businessPlanId = jobResult.businessPlanId;

        const diff = await ventureSnapshotService.compareSnapshots(
            project.id,
            first.snapshot.version,
            latestSnapshotVersion
        );
        assert.ok(diff, "Snapshot diff should be returned");
        assert.equal(
            diff.sections.changed.length,
            1,
            "Diff should include exactly one changed section"
        );
        assert.equal(
            diff.sections.changed[0]?.key,
            targetKey,
            "Changed section should match target key"
        );

        const document = await businessPlanService.getDocument(businessPlanId, org.id);
        assert.ok(document, "Business plan should be returned");

        const sectionKeys = (document?.sections ?? []).map((section) => section.key);
        const firstSection = (document?.sections ?? [])[0]?.content ?? null;

        const diffSections = {
            added: [...(diff?.sections.added ?? [])].sort(),
            removed: [...(diff?.sections.removed ?? [])].sort(),
            unchanged: [...(diff?.sections.unchanged ?? [])].sort(),
            changed: [...(diff?.sections.changed ?? [])]
                .map((item) => ({
                    key: item.key,
                    fromContent: normalizeContent(item.fromContent),
                    toContent: normalizeContent(item.toContent),
                }))
                .sort((a, b) => a.key.localeCompare(b.key)),
        };

        const sampleText =
            (normalizeContent(firstSection) as { text?: string } | null)?.text ?? null;

        const snapshot = {
            schemaVersion: 1,
            document: {
                sectionKeys,
                firstSection: normalizeContent(firstSection),
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
                sampleText,
            },
            rateLimit: {
                limit: Number(process.env.BUSINESS_PLAN_GENERATE_LIMIT || "3"),
                windowMinutes: Number(process.env.BUSINESS_PLAN_GENERATE_WINDOW_MINUTES || "60"),
            },
        };

        assertSnapshot(snapshot);

        console.log("Business Plan Engine Stage 3 tests: OK");
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
    console.error("Business Plan Engine Stage 3 tests failed:", error);
    process.exit(1);
});
