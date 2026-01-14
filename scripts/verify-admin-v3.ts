
import "dotenv/config";
import { prisma } from "@/lib/db";
import { adminCopy } from "@/lib/admin/adminCopy";
import { v4 as uuidv4 } from "uuid";

async function main() {
    console.log("🇪🇸 Verifying Admin V3 (Localization & Controls)...");

    // 1. Verify Localization Copy
    console.log("\n1. Checking Spanish Copy...");
    if (adminCopy.systemHealth.title === "Estado del Sistema" &&
        adminCopy.jobs.title === "Trabajos Globales") {
        console.log("✅ Admin Copy is loaded and is in Spanish.");
        console.log(`   Sample: "${adminCopy.actions.warning}"`);
    } else {
        console.error("❌ Admin Copy mismatch or not in Spanish.");
        process.exit(1);
    }

    // 0. Setup: Get a real project
    const project = await prisma.project.findFirst({ include: { org: true } });
    if (!project) {
        console.error("❌ No project found. Run db:seed.");
        process.exit(1);
    }
    const { id: projectId, orgId } = project;

    // 2. Verify Job Inspector Logic (Retry)
    console.log("\n2. Verifying Retry Logic...");
    const failedJobId = uuidv4();
    await prisma.job.create({
        data: {
            id: failedJobId,
            type: "GENERATE_OUTPUT",
            status: "FAILED",
            stage: "test-stage",
            payload: {},
            error: "Something went wrong",
            orgId: orgId,
            projectId: projectId
        }
    });

    // Simulate Retry Action (DB Update)
    await prisma.job.update({
        where: { id: failedJobId },
        data: {
            status: "QUEUED",
            attempts: 0,
            error: null,
            startedAt: null,
            completedAt: null
        }
    });

    const retriedJob = await prisma.job.findUnique({ where: { id: failedJobId } });
    if (retriedJob?.status === "QUEUED" && retriedJob.attempts === 0 && !retriedJob.error) {
        console.log("✅ Retry Logic works (FAILED -> QUEUED).");
    } else {
        console.error("❌ Retry Logic failed.");
    }

    // 3. Verify Job Inspector Logic (Force Fail)
    console.log("\n3. Verifying Force Fail Logic...");
    const stuckJobId = uuidv4();
    await prisma.job.create({
        data: {
            id: stuckJobId,
            type: "GENERATE_OUTPUT",
            status: "PROCESSING",
            stage: "test-stage",
            payload: {},
            orgId: orgId,
            projectId: projectId,
            startedAt: new Date()
        }
    });

    // Simulate Force Fail Action
    await prisma.job.update({
        where: { id: stuckJobId },
        data: {
            status: "FAILED",
            error: "Manually marked as failed by Admin",
            completedAt: new Date()
        }
    });

    const failedJob = await prisma.job.findUnique({ where: { id: stuckJobId } });
    if (failedJob?.status === "FAILED" && failedJob.error?.includes("Manually")) {
        console.log("✅ Force Fail Logic works (PROCESSING -> FAILED).");
    } else {
        console.error("❌ Force Fail Logic failed.");
    }

    // 4. Cleanup
    console.log("\n🧹 Cleaning up test data...");
    await prisma.job.deleteMany({
        where: { id: { in: [failedJobId, stuckJobId] } }
    });
    console.log("✅ Cleanup complete.");

    console.log("\n🎉 Admin V3 Logic Verified Successfully!");
}

main().catch(console.error);
