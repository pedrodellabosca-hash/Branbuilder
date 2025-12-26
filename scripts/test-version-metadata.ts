// @ts-nocheck
import { prisma } from "../lib/db";

async function main() {
    console.log("🚀 Starting Version Metadata Test...");

    const uniqueId = `test-${Date.now()}`;
    const orgId = "org_" + uniqueId;
    const projectId = "proj_" + uniqueId;
    const stageKey = "naming";
    const userId = "user_" + uniqueId;

    try {
        // 1. Setup Data
        console.log("📝 Creating test data...");

        await prisma.organization.create({
            data: {
                id: orgId,
                clerkOrgId: orgId,
                name: "Test Org",
                slug: "test-org-" + uniqueId,
            }
        });

        await prisma.project.create({
            data: {
                id: projectId,
                orgId: orgId,
                name: "Test Project",
                description: "Test",
            }
        });

        const stage = await prisma.stage.create({
            data: {
                projectId,
                stageKey,
                name: "Naming",
                module: "A",
                order: 1,
                status: "NOT_STARTED",
            }
        });

        const output = await prisma.output.create({
            data: {
                projectId,
                stageId: stage.id,
                name: "Output Naming",
                outputKey: "naming_output",
            }
        });

        // 2. Create Version with Metadata
        console.log("💾 Creating version with metadata (preset: quality, tokens: 4110)...");
        await prisma.outputVersion.create({
            data: {
                outputId: output.id,
                version: 1,
                content: { text: "Test Content" },
                provider: "OPENAI",
                model: "gpt-4o",
                type: "GENERATED",
                createdBy: userId,
                generationParams: {
                    preset: "quality",
                    tokensIn: 1234,
                    tokensOut: 2876,
                    totalTokens: 4110,
                    latencyMs: 1500
                }
            }
        });

        // 3. Simulate API Retrieval & Mapping
        console.log("🔍 Fetching and verifying metadata mapping...");

        const fetchedOutput = await prisma.output.findUnique({
            where: { id: output.id },
            include: {
                versions: { orderBy: { version: "desc" } }
            }
        });

        const version = fetchedOutput.versions[0];
        const params = version.generationParams || {};

        // This simulates the logic in the API route
        const runInfo = {
            provider: version.provider,
            model: version.model,
            preset: params.preset || null,
            inputTokens: params.tokensIn || 0,
            outputTokens: params.tokensOut || 0,
            totalTokens: params.totalTokens || 0,
        };

        console.log("📊 Mapped RunInfo:", runInfo);

        // 4. Assertions
        if (runInfo.preset !== "quality") throw new Error("Preset mismatch!");
        if (runInfo.totalTokens !== 4110) throw new Error("Total tokens mismatch!");
        if (runInfo.model !== "gpt-4o") throw new Error("Model mismatch!");

        console.log("✅ Metadata Verified Successfully!");

    } catch (e) {
        console.error("❌ Test Failed:", e);
    } finally {
        console.log("🧹 Cleaning up...");
        await prisma.outputVersion.deleteMany({ where: { createdBy: userId } });
        await prisma.output.deleteMany({ where: { projectId } });
        await prisma.stage.deleteMany({ where: { projectId } });
        await prisma.project.deleteMany({ where: { id: projectId } });
        await prisma.organization.deleteMany({ where: { id: orgId } });
    }
}

main();
