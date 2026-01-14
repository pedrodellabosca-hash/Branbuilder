
import dotenv from "dotenv";
import path from "path";
import { prisma } from "../lib/db";
import { getAIProvider, resetAIProvider } from "../lib/ai";
import { enqueueStageJob } from "../lib/stages/runStage";

// Force Mock Mode
process.env.AI_MOCK_MODE = "1";
process.env.AI_PROVIDER = "MOCK";

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function main() {
    console.log("🧪 Starting Core Engine Smoke Test (Mock Mode)...");

    // 1. Setup Data
    console.log("1. Setting up test data...");
    const org = await prisma.organization.findFirst();
    if (!org) throw new Error("No organization found. Please seed DB.");

    const project = await prisma.project.create({
        data: {
            orgId: org.id,
            name: `Smoke Test Project ${Date.now()}`,
            status: "IN_PROGRESS",
            moduleA: true,
        }
    });
    console.log(`   Created Project: ${project.name} (${project.id})`);

    // 2. Enqueue Job (Module A - Naming)
    console.log("2. Enqueuing Naming Stage Job...");
    const userId = "user_smoke_test";

    // Simulate API call to enqueue
    const enqueueResult = await enqueueStageJob({
        projectId: project.id,
        stageKey: "naming",
        userId,
        orgId: org.clerkOrgId,
        provider: "MOCK",
        model: "mock-v1"
    });

    if (!enqueueResult.success) {
        throw new Error(`Enqueue failed: ${enqueueResult.error}`);
    }
    console.log(`   Job Enqueued: ${enqueueResult.jobId}`);

    // 3. Process Job (Simulate Worker)
    console.log("3. simulating Worker processing...");

    // Explicitly import worker function to run one-off
    // We can't import worker.ts directly as it starts the loop.
    // Instead, we use runStage.processStageJob directly as the worker would.
    const { processStageJob } = await import("../lib/stages/runStage");

    // We need the resolved config that was saved to the job
    const job = await prisma.job.findUnique({ where: { id: enqueueResult.jobId } });
    if (!job) throw new Error("Job not found in DB");

    const effectiveConfig = job.runConfig as any; // typed as any/json in prisma

    await processStageJob(
        job.id,
        enqueueResult.stageId!,
        enqueueResult.outputId!,
        "naming",
        project.name,
        false, // isRegenerate
        userId,
        effectiveConfig
    );
    console.log("   Job processed successfully.");

    // 4. Verify Output
    console.log("4. Verifying Output...");
    const output = await prisma.output.findUnique({
        where: { id: enqueueResult.outputId },
        include: { versions: true }
    });

    if (!output || output.versions.length === 0) {
        throw new Error("Output or Version not created.");
    }

    const version = output.versions[0];
    const content = version.content as any;

    console.log("   Output Created:", output.name);
    console.log("   Version:", version.version);
    console.log("   Provider:", version.provider);
    console.log("   Content Title:", content.title); // Should match mock logic

    if (version.provider !== "MOCK") {
        throw new Error(`Provider mismatch: expected MOCK, got ${version.provider}`);
    }

    console.log("\n✅ Smoke Test Passed!");
}

main()
    .catch(e => {
        console.error("\n❌ Smoke Test Failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
