
import { PrismaClient } from "@prisma/client";
import { resolveEffectiveConfig, serializeConfig, deserializeConfig } from "../lib/ai/resolve-config";
import { recordUsage } from "../lib/usage";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function main() {
    console.log("🚀 Starting System Robustness Test...");

    // 1. Setup Test Data
    const testOrgId = "test-org-" + randomUUID();
    const testClerkId = "clerk-" + testOrgId;

    console.log(`\n1. Creating Test Organization (${testOrgId})...`);
    const org = await prisma.organization.create({
        data: {
            id: testOrgId,
            clerkOrgId: testClerkId,
            name: "Test Robustness Org",
            slug: testOrgId,
            plan: "MID",
            monthlyTokenLimit: 1000,
            bonusTokens: 500,
            monthlyTokensUsed: 900, // 900 used, 100 remaining
        }
    });
    console.log("✅ Organization created.");

    // 2. Verify Config Persistence
    console.log("\n2. Verifying Config Persistence...");

    // Simulate resolving config
    const effectiveConfig = resolveEffectiveConfig({
        stageKey: "naming",
        preset: "quality",
        provider: "OPENAI",
        model: "gpt-4o"
    });

    const serialized = serializeConfig(effectiveConfig);

    // Create Job with runConfig
    const job = await prisma.job.create({
        data: {
            orgId: org.id,
            type: "GENERATE_OUTPUT",
            payload: {
                stageKey: "naming",
                ...serialized // redundancy
            }, // Minimal payload
            runConfig: serialized as any, // Source of Truth
        }
    });

    // Fetch back
    const fetchedJob = await prisma.job.findUnique({
        where: { id: job.id }
    });

    if (!fetchedJob?.runConfig) {
        throw new Error("❌ Saved job is missing runConfig!");
    }

    const deserialized = deserializeConfig(fetchedJob.runConfig as Record<string, unknown>);

    if (deserialized?.preset === "quality" && deserialized?.model === "gpt-4o") {
        console.log("✅ Config persisted and deserialized correctly:",
            `${deserialized.preset}/${deserialized.provider}/${deserialized.model}`);
    } else {
        throw new Error(`❌ Config mismatch: ${JSON.stringify(deserialized, null, 2)}`);
    }

    // 3. Verify Token Usage Priority (Strict)
    console.log("\n3. Verifying Token Usage Priority...");
    // Current state: Limit 1000, Used 900 -> Monthly Remaining: 100. Bonus: 500.
    // We consume 200 tokens.
    // Expectation: 100 from Monthly, 100 from Bonus.
    // Result: Used 1000, Bonus 400.

    await recordUsage({
        orgId: org.id,
        provider: "OPENAI",
        model: "gpt-4o",
        inputTokens: 100,
        outputTokens: 100
    });

    const updatedOrg = await prisma.organization.findUnique({
        where: { id: org.id }
    });

    console.log("Updated Stats:", {
        used: updatedOrg?.monthlyTokensUsed,
        bonus: updatedOrg?.bonusTokens
    });

    if (updatedOrg?.monthlyTokensUsed === 1000 && updatedOrg?.bonusTokens === 400) {
        console.log("✅ Token Priority Correct: 100 monthly + 100 bonus consumed.");
    } else {
        throw new Error("❌ Token Priority Failed!");
    }

    // Cleanup
    console.log("\n🧹 Cleaning up...");
    await prisma.job.delete({ where: { id: job.id } });
    await prisma.usage.deleteMany({ where: { orgId: org.id } });
    await prisma.organization.delete({ where: { id: org.id } });
    console.log("✨ Test Completed Successfully!");
}

main()
    .catch((e) => {
        console.error("❌ Test Failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
