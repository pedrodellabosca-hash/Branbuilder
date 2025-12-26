
import { prisma } from "../lib/db";
import { runStage } from "../lib/stages/runStage";
import { getModels } from "../lib/ai/model-registry";

async function main() {
    console.log("🚀 Testing Stage Config Persistence & Usage");

    // 1. Setup Data
    const org = await prisma.organization.findFirst();
    if (!org) throw new Error("No org found");

    const user = await prisma.orgMember.findFirst({ where: { orgId: org.id } });
    const userId = user?.userId || "test_user";

    const project = await prisma.project.create({
        data: {
            name: "Test Config " + Date.now(),
            orgId: org.id,
            status: "IN_PROGRESS",
            moduleA: true,
        }
    });
    console.log(`Created Project: ${project.id}`);

    // 2. Create Stage manually to save config
    const stage = await prisma.stage.create({
        data: {
            projectId: project.id,
            stageKey: "naming",
            name: "Naming Test",
            module: "A",
            order: 1,
            // SAVE CUSTOM CONFIG
            config: {
                provider: "OPENAI",
                model: "gpt-4-turbo", // Distinct from default gpt-4o
                preset: "quality"
            }
        }
    });
    console.log(`Created Stage with Config: ${JSON.stringify((stage as any).config)}`);

    // 3. Run Stage (without overrides)
    console.log("Running stage...");
    const result = await runStage({
        projectId: project.id,
        stageKey: "naming",
        userId: userId,
        orgId: org.clerkOrgId,
        // No explicit provider/model passed -> should use stage.config
    });

    if (!result.success) {
        console.error("Run failed:", result.error);
        process.exit(1);
    }

    console.log("Job ID:", result.jobId);

    // 4. Verify Job Config
    const job = await prisma.job.findUnique({
        where: { id: result.jobId }
    });

    const runConfig = job?.runConfig as any;
    console.log("Job Effective Config:", JSON.stringify(runConfig, null, 2));

    if (runConfig.model === "gpt-4-turbo") {
        console.log("✅ SUCCESS: Job used the stage-specific model (gpt-4-turbo).");
    } else {
        console.error(`❌ FAILURE: Job used ${runConfig.model} instead of gpt-4-turbo.`);
        process.exit(1);
    }

    // Clean up
    await prisma.project.delete({ where: { id: project.id } });
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
