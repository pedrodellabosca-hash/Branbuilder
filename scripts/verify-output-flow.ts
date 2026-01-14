
import { prisma } from "@/lib/db";
import { moduleEngine } from "@/lib/modules/ModuleEngine";
import { outputService } from "@/lib/outputs/OutputService";

const STAGES_TO_TEST = [
    { key: "naming", model: "gpt-4o-mini" },
    { key: "context", model: "gpt-4o-mini" } // Testing another stage
];

async function verifyFlow() {
    console.log("🚀 Starting Multi-Stage Output Verification...");

    let projectId: string | null = null;

    try {
        // 1. Setup
        const org = await prisma.organization.findFirst({
            where: { members: { some: {} } },
            include: { members: true }
        });
        if (!org || !org.members[0]) throw new Error("No org/user found");
        const userId = org.members[0].userId;
        const orgId = org.clerkOrgId;
        const dbOrgId = org.id;

        // 2. Create Project
        const project = await prisma.project.create({
            data: {
                name: "Multi-Stage Verify " + Date.now(),
                orgId: dbOrgId,
                description: "E2E Test"
            }
        });
        projectId = project.id;
        console.log(`✅ Created Project: ${projectId}`);

        for (const stageInfo of STAGES_TO_TEST) {
            console.log(`\n👉 Testing Stage: '${stageInfo.key}'`);

            // 3. Run Stage
            const run = await moduleEngine.runStage({
                projectId,
                stageKey: stageInfo.key,
                userId,
                orgId,
                config: { preset: "fast", provider: "OPENAI", model: stageInfo.model }
            });

            if (!run.success) throw new Error(`Run failed for ${stageInfo.key}: ` + run.error);
            console.log(`✅ Generated AI Version (Job: ${run.jobId})`);

            const outputId = run.outputId;

            // 4. Create Manual Version
            console.log("👉 Creating Manual Version...");

            const manualContent = { raw: `Manual Edit for ${stageInfo.key}` };
            const mapping = await prisma.outputVersion.create({
                data: {
                    outputId: outputId!,
                    version: (await prisma.outputVersion.count({ where: { outputId: outputId } })) + 1,
                    content: manualContent,
                    provider: "MANUAL",
                    model: "human",
                    promptSetVersion: "manual",
                    generationParams: {
                        latencyMs: 0,
                        tokensIn: 0,
                        tokensOut: 0,
                        totalTokens: 0,
                        preset: "manual",
                        validated: true,
                        multiplier: 0,
                        billedTokens: 0,
                        editedFromVersion: null,
                        edited: true,
                    },
                    createdBy: userId,
                    type: "EDITED",
                    status: "GENERATED",
                },
            });
            const createdVersionId = mapping.id;
            console.log(`✅ Created Manual Version: ${createdVersionId}`);

            // 5. Approve Manual Version (Strict check)
            console.log("👉 Approving Manual Version...");

            await prisma.$transaction(async (tx) => {
                await tx.outputVersion.update({
                    where: { id: createdVersionId! },
                    data: { status: "APPROVED" }
                });

                await tx.outputVersion.updateMany({
                    where: {
                        outputId: outputId!,
                        status: "APPROVED",
                        id: { not: createdVersionId! }
                    },
                    data: { status: "OBSOLETE" }
                });

                await tx.stage.update({
                    where: { id: run.stageId },
                    data: { status: "APPROVED" },
                });
            });

            // 6. Verification
            const versions = await prisma.outputVersion.findMany({
                where: { outputId: outputId! },
                orderBy: { version: 'asc' }
            });

            const manualV = versions.find(v => v.id === createdVersionId);
            if (manualV?.status !== "APPROVED") throw new Error(`Manual version not APPROVED for ${stageInfo.key}`);

            console.log(`✅ ${stageInfo.key} Manual Version status is APPROVED`);

            const stage = await prisma.stage.findUnique({ where: { id: run.stageId } });
            if (stage?.status !== "APPROVED") throw new Error(`Stage ${stageInfo.key} status not APPROVED`);

            console.log(`✅ Stage ${stageInfo.key} status is APPROVED`);
        }

        console.log("\n🎉 All Stages Verified Successfully!");

    } catch (e) {
        console.error("❌ Verification Failed:", e);
        process.exit(1);
    } finally {
        if (projectId) {
            await prisma.project.delete({ where: { id: projectId } });
            console.log("🧹 Cleanup done");
        }
    }
}

verifyFlow();
