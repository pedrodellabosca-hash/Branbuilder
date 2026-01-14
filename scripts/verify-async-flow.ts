
import "dotenv/config";
import { spawn, type ChildProcess } from "child_process";
import { prisma } from "@/lib/db";
import { moduleEngine } from "@/lib/modules/ModuleEngine";

// Test Constants
const TEST_ORG_ID = "org_test_async_flow";
const TEST_USER_ID = "user_test_async_flow";
const TEST_PROJECT_NAME = "Async Flow Verification Project";
const STAGE_KEY = "naming";

async function main() {
    console.log("🚀 Starting Async Flow Verification...");

    // 1. Setup Test Data
    console.log("\n📦 Setting up test data...");

    // Ensure Org (Upsert)
    const org = await prisma.organization.upsert({
        where: { clerkOrgId: TEST_ORG_ID },
        update: {},
        create: {
            clerkOrgId: TEST_ORG_ID,
            name: "Async Test Org",
            slug: "async-test-org-unique-" + Date.now(),
            plan: "BASIC",
        },
    });

    // Create Project
    const project = await prisma.project.create({
        data: {
            orgId: org.id,
            name: TEST_PROJECT_NAME,
            description: "Created by verify-async-flow.ts",
            status: "IN_PROGRESS",
            moduleA: true,
            members: {
                create: {
                    userId: TEST_USER_ID,
                    email: "test@example.com",
                    role: "PROJECT_OWNER",
                }
            }
        },
    });
    console.log(`✅ Project created: ${project.id}`);

    // 2. Start Worker Process
    console.log("\n👷 Starting Worker process...");
    let workerProcess: ChildProcess | null = null;

    try {
        workerProcess = spawn("npx", ["tsx", "lib/jobs/worker.ts"], {
            stdio: "inherit", // Pipe output to parent to see worker logs
            env: { ...process.env, WORKER_ID: "test-worker-1" },
            detached: false,
        });

        // Give worker a moment to spin up
        await new Promise(r => setTimeout(r, 4000)); // Increased wait time
        console.log("✅ Worker started (hopefully).");

        // 3. Enqueue Job via ModuleEngine (mimicking API)
        console.log("\n📨 Enqueueing Stage Job via ModuleEngine...");

        const runResult = await moduleEngine.runStage({
            projectId: project.id,
            stageKey: STAGE_KEY,
            userId: TEST_USER_ID,
            orgId: TEST_ORG_ID,
            regenerate: true, // Force new job
        });

        if (runResult.status !== "QUEUED") {
            throw new Error(`Expected status QUEUED, got ${runResult.status}`);
        }

        console.log(`✅ Job Enqueued: ${runResult.jobId} (Status: ${runResult.status})`);

        // 4. Poll for Completion
        console.log("\n⏳ Polling for Job Completion...");
        const maxAttempts = 30;
        let finalJob = null;

        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(r => setTimeout(r, 2000));

            const job = await prisma.job.findUnique({ where: { id: runResult.jobId } });
            process.stdout.write(`.`); // progress dot

            if (job?.status === "DONE" || job?.status === "FAILED") {
                finalJob = job;
                break;
            }
        }
        console.log(""); // newline

        if (!finalJob) {
            throw new Error("Timeout waiting for job completion");
        }

        if (finalJob.status === "FAILED") {
            throw new Error(`Job failed: ${finalJob.error}`);
        }

        console.log(`✅ Job Completed: ${finalJob.id}`);
        console.log("   Result:", JSON.stringify(finalJob.result, null, 2));

        // 5. Verify Output and Version
        console.log("\n🔍 Verifying Artifacts...");
        const result = finalJob.result as any;

        if (!result.outputId || !result.versionNumber) {
            throw new Error("Job result missing outputId or versionNumber");
        }

        const version = await prisma.outputVersion.findFirst({
            where: {
                outputId: result.outputId,
                version: result.versionNumber
            }
        });

        if (!version) {
            throw new Error("OutputVersion not found in DB");
        }

        console.log(`✅ OutputVersion Verified: v${version.version} (Type: ${version.type})`);

        // 6. Test Approval Flow
        console.log("\n👍 Testing Approval Flow...");
        // Approve this version via Prisma (mimicking route)
        const updatedVersion = await prisma.outputVersion.update({
            where: { id: version.id },
            data: { status: "APPROVED" }
        });

        // Update stage status
        await prisma.stage.update({
            where: { id: result.stageId || runResult.stageId },
            data: { status: "APPROVED" }
        });

        console.log(`✅ Version Approved: ${updatedVersion.id}`);

    } catch (error) {
        console.error("\n❌ Verification Failed:", error);
        process.exit(1);
    } finally {
        // Cleanup
        console.log("\n🧹 Cleanup...");

        if (workerProcess) {
            console.log("Killing worker process...");
            workerProcess.kill("SIGTERM");
        }

        // Clean DB
        try {
            await prisma.job.deleteMany({ where: { projectId: project.id } });
            await prisma.outputVersion.deleteMany({ where: { output: { projectId: project.id } } });
            await prisma.output.deleteMany({ where: { projectId: project.id } });
            // await prisma.stage.deleteMany({ where: { projectId: project.id } }); // Cascades usually
            await prisma.project.delete({ where: { id: project.id } });
        } catch (e) {
            console.warn("Cleanup warning:", e);
        }

        console.log("Done.");
        process.exit(0);
    }
}

main();
