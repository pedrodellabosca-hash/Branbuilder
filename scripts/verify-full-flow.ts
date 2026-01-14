
import "dotenv/config";
import { prisma } from "@/lib/db";
import { enqueueStageJob } from "@/lib/stages/runStage";
import { moduleEngine } from "@/lib/modules/ModuleEngine";

async function main() {
    console.log("🚀 Starting End-to-End Flow Verification...");

    // 1. Get Setup Data
    const org = await prisma.organization.findFirst();
    if (!org) throw new Error("No org found");

    let project = await prisma.project.findFirst({ where: { orgId: org.id } });
    if (!project) {
        console.log("Creating temporary test project...");
        project = await prisma.project.create({
            data: {
                name: "QA Verification Project",
                orgId: org.id,
                moduleA: true,
                moduleB: false,
                description: "Auto-generated for QA",
                status: "IN_PROGRESS",
                language: "ES"
            }
        });
    }

    const userId = "user_test_verify";
    console.log(`Context: Org=${org.slug} Project=${project.name}`);

    // 2. Trigger Stage via Engine (Simulate API)
    console.log("\n1️⃣  Triggering 'naming' stage...");
    const result = await moduleEngine.runStage({
        projectId: project.id,
        stageKey: "naming",
        userId: userId,
        orgId: org.clerkOrgId,
        config: {
            preset: "fast", // Use fast for speed
            provider: "OPENAI",
            model: "gpt-3.5-turbo" // reliable model
        }
    });

    if (!result.success || !result.jobId) {
        console.error("❌ Failed to enqueue job:", result.error);
        process.exit(1);
    }

    console.log(`✅ Job Enqueued: ID=${result.jobId} Status=${result.status}`);

    // 3. Poll for Completion (Simulat StageActions polling)
    console.log("\n2️⃣  Polling for completion...");
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
        const job = await prisma.job.findUnique({ where: { id: result.jobId } });

        if (!job) {
            console.error("❌ Job disappeared!");
            process.exit(1);
        }

        process.stdout.write(`.${job.status}`);

        if (job.status === "DONE") {
            console.log("\n✅ Job DONE!");
            console.log("Result:", JSON.stringify(job.result, null, 2));

            // 4. Verify Output Content
            if (job.result && typeof job.result === 'object' && 'outputId' in job.result) {
                const outputId = (job.result as any).outputId;
                const output = await prisma.output.findUnique({
                    where: { id: outputId },
                    include: { versions: { orderBy: { version: 'desc' }, take: 1 } }
                });

                const latest = output?.versions[0];
                console.log("\n3️⃣  Output Content Verification:");
                console.log("Provider:", latest?.provider);
                console.log("Model:", latest?.model);
                console.log("Content Preview:", JSON.stringify(latest?.content).slice(0, 200) + "...");
            }
            break;
        }

        if (job.status === "FAILED") {
            console.error("\n❌ Job FAILED:", job.error);
            process.exit(1);
        }

        await new Promise(r => setTimeout(r, 1000));
        attempts++;
    }

    if (attempts >= maxAttempts) {
        console.error("\n❌ Timeout waiting for job");
        process.exit(1);
    }
}

main().catch(console.error);
