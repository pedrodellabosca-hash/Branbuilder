
import "dotenv/config";
import { prisma } from "@/lib/db";
import { moduleEngine } from "@/lib/modules/ModuleEngine";

async function main() {
    console.log("🚀 Starting Enhanced UI Flow Verification...");

    // 1. Setup Project
    const org = await prisma.organization.findFirst();
    if (!org) throw new Error("No org found");

    const project = await prisma.project.create({
        data: {
            name: `UI Flow Test ${Date.now()}`,
            orgId: org.id,
            moduleA: true,
            status: "IN_PROGRESS",
            language: "ES"
        }
    });

    console.log(`Context: Project=${project.name} (${project.id})`);

    // 2. Trigger Stage (Simulate UI Call)
    console.log("\n1️⃣  Triggering 'naming' stage...");
    const result = await moduleEngine.runStage({
        projectId: project.id,
        stageKey: "naming",
        userId: "test-user-ui",
        orgId: org.clerkOrgId,
        config: { preset: "fast", provider: "OPENAI", model: "gpt-3.5-turbo" }
    });

    if (!result.success || !result.jobId) {
        console.error("❌ Failed to enqueue:", result.error);
        process.exit(1);
    }

    console.log(`✅ Job Enqueued: ID=${result.jobId}`);

    // 3. Monitor Dual Streams (Job Status & Output Version)
    // This simulates the 'Dual-Poll' logic in the UI
    console.log("\n2️⃣  Monitoring Job & Output streams...");

    const startTime = Date.now();
    let isDone = false;

    while (!isDone && (Date.now() - startTime) < 30000) { // 30s timeout
        // Check Job
        const job = await prisma.job.findUnique({ where: { id: result.jobId } });
        process.stdout.write(`[Job:${job?.status}] `);

        // Check Output
        const outputs = await prisma.output.findMany({
            where: { projectId: project.id, stageId: { endsWith: 'naming' } }, // Simple match
            include: { versions: true }
        });

        const hasVersions = outputs.some(o => o.versions.length > 0);
        if (hasVersions) {
            process.stdout.write(`[Output:FOUND!] `);
        }

        // Success Condition
        if (job?.status === 'DONE' && hasVersions) {
            console.log("\n\n✅ SUCCESS: Job DONE and Output Version created.");
            console.log(`Output: ${outputs[0].versions.length} versions`);
            isDone = true;
            break;
        }

        if (job?.status === 'FAILED') {
            console.error("\n❌ FAILED: Job reported failure.");
            process.exit(1);
        }

        await new Promise(r => setTimeout(r, 1000));
    }

    if (!isDone) {
        console.error("\n❌ TIMEOUT: Job or Output did not complete in time.");
        process.exit(1);
    }
}

main().catch(console.error);
