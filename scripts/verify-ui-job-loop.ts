
import "dotenv/config";
import { prisma } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

// Mock environment for the script
const MOCK_ORG_ID = "org_verify_ui_loop";
const MOCK_PROJECT_ID = "proj_verify_ui_loop";

async function main() {
    console.log("🚀 Verifying UI Job Loop (End-to-End)...");

    try {
        // 1. Setup: Create Org & Project if needed (or rely on seed, but let's be robust)
        // We'll just fetch the first available project to simulate real user flow
        const project = await prisma.project.findFirst({
            include: { org: true }
        });

        if (!project) {
            console.error("❌ No project found to test against. Run db:seed first.");
            process.exit(1);
        }

        console.log(`✅ Using project: ${project.name} (${project.id})`);

        // 2. Enqueue a Job (Simulate UI action)
        // We bypass the API and insert directly to enable robust testing without mocking NextRequest cookies completely
        console.log("➡️ Enqueuing job directly to DB...");
        const jobId = uuidv4();
        const stageKey = "naming";

        // Note: Job model does NOT have userId. It uses orgId/projectId.
        await prisma.job.create({
            data: {
                id: jobId,
                type: "GENERATE_OUTPUT",
                status: "QUEUED",
                payload: { stage: stageKey, regenerate: true },
                orgId: project.orgId,
                projectId: project.id,
                stage: stageKey
            }
        });
        console.log(`✅ Job enqueued: ${jobId}`);

        // 3. Poll for completion (Simulate UI polling)
        console.log("➡️ Polling for completion (max 30s)...");
        const start = Date.now();
        let status = "QUEUED";

        while (Date.now() - start < 30000) {
            const freshJob = await prisma.job.findUnique({ where: { id: jobId } });
            status = freshJob?.status || "UNKNOWN";

            process.stdout.write(`\r   Status: ${status}   `);

            if (status === "DONE") {
                console.log("\n✅ Job completed successfully!");
                break;
            }
            if (status === "FAILED") {
                console.error(`\n❌ Job failed: ${freshJob?.error}`);
                process.exit(1);
            }

            await new Promise(r => setTimeout(r, 1000));
        }

        if (status !== "DONE") {
            console.error("\n❌ Timeout waiting for job completion.");
            process.exit(1);
        }

        // 4. Verify Output
        console.log("➡️ Verifying output creation...");
        const output = await prisma.output.findFirst({
            where: {
                projectId: project.id
            },
            include: {
                versions: {
                    orderBy: { version: 'desc' },
                    take: 1
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        if (output) {
            console.log(`✅ Output found: ${output.name} (${output.outputKey})`);
            const latestVer = output.versions[0];
            if (latestVer) {
                console.log(`   Latest Version: v${latestVer.version} | Status: ${latestVer.status}`);
            } else {
                console.warn("   ⚠️ Output exists but has no versions.");
            }
        } else {
            console.warn("⚠️ Job DONE but no output record found (check worker logic).");
        }

        // 5. Test the status endpoint logic (Simulation)
        console.log("➡️ Verifying endpoint query logic...");
        const endpointResult = await prisma.job.findFirst({
            where: {
                id: jobId,
                projectId: project.id // Strict scoping check
            },
            select: { id: true, status: true }
        });

        if (endpointResult?.id === jobId) {
            console.log("✅ Endpoint query with Project Scoping works.");
        } else {
            console.error("❌ Endpoint query failed to find job with correct project scope.");
        }

    } catch (e: any) {
        console.error("❌ Script Error:", e);
        process.exit(1);
    }
}

main().catch(console.error);
