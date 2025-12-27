
import { prisma } from "@/lib/db";
import { moduleEngine } from "@/lib/modules/ModuleEngine";
import { outputService } from "@/lib/outputs/OutputService";

async function main() {
    console.log("🚀 Starting Core Loop Smoke Test...");

    // 1. Setup: Find valid Org/User
    const org = await prisma.organization.findFirst({
        include: { members: true }
    });

    if (!org || !org.members[0]) {
        console.error("❌ No Organization/User found. Please seed DB first.");
        process.exit(1);
    }

    const userId = org.members[0].userId;
    const orgId = org.clerkOrgId;
    const dbOrgId = org.id;

    console.log(`✅ Using Org: ${orgId} (DB: ${dbOrgId})`);
    console.log(`✅ Using User: ${userId}`);

    // 2. Create Project
    const projectName = `Smoke Test ${Date.now()}`;
    const project = await prisma.project.create({
        data: {
            name: projectName,
            orgId: dbOrgId,
            description: "Automated smoke test project",
        }
    });
    console.log(`✅ Created Project: ${project.id} (${project.name})`);

    try {
        // 3. Run Stage (Naming)
        console.log("👉 Running 'naming' stage...");
        const stageKey = "naming";

        const runResult = await moduleEngine.runStage({
            projectId: project.id,
            stageKey,
            userId,
            orgId,
            regenerate: false,
            config: {
                preset: "fast", // Use cheap/fast model
                provider: "OPENAI", // Explicitly use OpenAI if available
                model: "gpt-4o-mini"
            }
        });

        if (!runResult.success) {
            throw new Error(`Stage execution failed: ${runResult.error}`);
        }

        console.log(`✅ Stage Run Success! Job: ${runResult.jobId}`);

        // 4. Verify Output
        const output = await prisma.output.findFirst({
            where: { id: runResult.outputId },
            include: { versions: true }
        });

        if (!output) throw new Error("Output record not found");
        if (output.versions.length === 0) throw new Error("No output versions created");

        const latestVersion = output.versions[0];
        console.log(`✅ Output Verified: ${output.id}`);
        console.log(`   - Versions: ${output.versions.length}`);
        console.log(`   - Latest Content Preview: ${JSON.stringify(latestVersion.content).slice(0, 50)}...`);

        // 5. Approve Stage
        console.log("👉 Approving Stage...");

        // Update Stage Status
        await prisma.stage.update({
            where: { id: runResult.stageId },
            data: { status: "APPROVED" }
        });

        // Update OutputVersion Status
        await prisma.outputVersion.updateMany({
            where: { id: latestVersion.id },
            data: { status: "APPROVED" }
        });

        // Verify Status
        const stage = await prisma.stage.findUnique({ where: { id: runResult.stageId } });
        if (stage?.status !== "APPROVED") throw new Error("Stage status not updated to APPROVED");

        console.log("✅ Stage Approved.");

        // 6. Cleanup
        console.log("🧹 Cleaning up...");
        await prisma.project.delete({ where: { id: project.id } });
        console.log("✅ Project deleted.");

        console.log("\n🎉 SMOKE TEST PASSED: ALL SYSTEMS GO");

    } catch (error) {
        console.error("\n❌ SMOKE TEST FAILED:", error);
        // Attempt cleanup
        try {
            await prisma.project.delete({ where: { id: project.id } });
            console.log("⚠️ Cleanup performed after failure.");
        } catch (e) { }
        process.exit(1);
    }
}

main();
