
import { prisma } from "../lib/db";
import { runStage } from "../lib/stages/runStage";

async function main() {
    console.log("🚀 Testing Runner Model Fallback...");

    // 1. Setup Data
    let org = await prisma.organization.findFirst();
    if (!org) {
        console.log("Creating default org...");
        org = await prisma.organization.create({
            data: {
                clerkOrgId: "org_test_fallback_" + Date.now(),
                name: "Fallback Test Org",
                slug: "fallback-test",
                plan: "BASIC"
            }
        });
    }

    const project = await prisma.project.create({
        data: {
            name: "Fallback Test Project " + Date.now(),
            orgId: org.id,
            status: "IN_PROGRESS",
            moduleA: true,
        }
    });

    console.log(`Created Project: ${project.id}`);

    // Create stage with INVALID model
    const INVALID_MODEL = "gpt-5-unreleased-fake";
    const stage = await prisma.stage.create({
        data: {
            projectId: project.id,
            stageKey: "naming",
            name: "Names",
            module: "A",
            order: 1,
            config: {
                provider: "OPENAI",
                model: INVALID_MODEL,
                preset: "balanced"
            }
        }
    });

    console.log(`Created Stage with Invalid Model: ${INVALID_MODEL}`);

    // Run Stage
    const result = await runStage({
        projectId: project.id,
        stageKey: "naming",
        userId: "test_user_fallback",
        orgId: org.clerkOrgId,
    });

    console.log("Run Result Status:", result.status);
    console.log("Run Result Model:", result.model);

    // Verify
    if (result.model === INVALID_MODEL) {
        console.error("❌ FAILURE: Runner used the invalid model!");
        process.exit(1);
    }

    if (result.model === "gpt-4o") { // Default for balanced
        console.log("✅ SUCCESS: Runner fell back to gpt-4o (balanced default).");
    } else {
        console.warn(`⚠️ WARNING: Runner fell back to ${result.model}, expected gpt-4o. Check logic.`);
    }

    if (result.status === "FAILED") {
        console.log("Job failed likely due to no API key, but model fallback logic executed check above.");
        // This is expected if no API Key. We only care about result.model property returned from runStage.
    }

    // Checking OutputVersion if possible (requires successful run)
    // If run failed, we can't check OutputVersion metadata.
    // But `result.model` comes from `effectiveConfig` which is resolved BEFORE execution.
    // So `result.model` is reliable even if execution fails later.

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
