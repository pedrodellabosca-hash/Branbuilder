import dotenv from "dotenv";
import path from "path";
import { prisma } from "../lib/db";
import { runStage } from "../lib/stages/runStage";
import { STAGE_DEPENDENCIES } from "../lib/stages/gating";
import { Prisma } from "@prisma/client";
import { type StageKey } from "../lib/stages/schemas";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

process.env.AI_MOCK_MODE = "1";
process.env.AI_PROVIDER = "MOCK";

async function invalidateDownstream(
    tx: Prisma.TransactionClient,
    projectId: string,
    changedStageKey: StageKey
) {
    const dependents: StageKey[] = [];

    for (const [key, deps] of Object.entries(STAGE_DEPENDENCIES) as Array<
        [StageKey, StageKey[]]
    >) {
        if (deps.includes(changedStageKey)) {
            dependents.push(key);
        }
    }

    if (dependents.length === 0) return;

    for (const depKey of dependents) {
        const stage = await tx.stage.findFirst({
            where: { projectId, stageKey: depKey }
        });

        if (stage && stage.status !== "NOT_STARTED") {
            await tx.stage.update({
                where: { id: stage.id },
                data: { status: "NOT_STARTED" }
            });

            await invalidateDownstream(tx, projectId, depKey);
        }
    }
}

async function main() {
    console.log("🧪 Starting Venture Flow Smoke Test (Mock Mode)...");

    const TEST_ORG_ID = "org_smoke_venture";
    const TEST_USER_ID = "user_smoke_venture";

    const org = await prisma.organization.upsert({
        where: { clerkOrgId: TEST_ORG_ID },
        update: {},
        create: {
            clerkOrgId: TEST_ORG_ID,
            name: "Venture Smoke Org",
            slug: `venture-smoke-${Date.now()}`,
            plan: "BASIC",
        },
    });

    await prisma.orgMember.upsert({
        where: {
            orgId_userId: {
                orgId: org.id,
                userId: TEST_USER_ID,
            }
        },
        update: { role: "OWNER" },
        create: {
            orgId: org.id,
            userId: TEST_USER_ID,
            email: "venture-smoke@example.com",
            role: "OWNER",
        }
    });

    const project = await prisma.project.create({
        data: {
            orgId: org.id,
            name: `Venture Smoke Project ${Date.now()}`,
            status: "IN_PROGRESS",
            moduleVenture: true,
        }
    });

    console.log(`✅ Project created: ${project.id}`);

    await prisma.stage.createMany({
        data: [
            {
                projectId: project.id,
                stageKey: "venture_idea_validation",
                name: "Validación de Idea",
                module: "A",
                order: -30,
                status: "APPROVED",
            },
            {
                projectId: project.id,
                stageKey: "venture_buyer_persona",
                name: "Buyer Persona (Venture)",
                module: "A",
                order: -20,
                status: "APPROVED",
            },
        ],
        skipDuplicates: true,
    });

    const runResult = await runStage({
        projectId: project.id,
        stageKey: "venture_intake",
        userId: TEST_USER_ID,
        orgId: TEST_ORG_ID,
        provider: "MOCK",
        preset: "fast",
    });

    if (!runResult.success || !runResult.stageId || !runResult.outputId) {
        throw new Error(`Run failed: ${runResult.error}`);
    }

    const output = await prisma.output.findUnique({
        where: { id: runResult.outputId },
        include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    });

    const version = output?.versions[0];
    if (!version) throw new Error("No output version generated");

    await prisma.$transaction(async (tx) => {
        await tx.outputVersion.update({
            where: { id: version.id },
            data: { status: "APPROVED" },
        });

        await tx.stage.update({
            where: { id: runResult.stageId },
            data: { status: "APPROVED" },
        });

        await invalidateDownstream(tx, project.id, "venture_intake");
    });

    const invalidated = await prisma.stage.findMany({
        where: {
            projectId: project.id,
            stageKey: { in: ["venture_idea_validation", "venture_buyer_persona"] }
        }
    });

    const invalidationOk = invalidated.every((stage) => stage.status === "NOT_STARTED");
    if (!invalidationOk) {
        throw new Error("Downstream invalidation did not reset stages to NOT_STARTED");
    }

    console.log("✅ Venture intake approved and downstream invalidation verified.");
}

main()
    .catch((e) => {
        console.error("❌ Venture flow smoke test failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
