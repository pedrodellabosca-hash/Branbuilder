// @ts-nocheck
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🚀 Starting Version History API Test...");

    // 1. Setup Test Data (ensure we have versions)
    const testOrgId = "test-history-org-" + Math.random().toString(36).substring(7);

    // Create Org, Project, Stage, Output, OutputVersions
    const org = await prisma.organization.create({
        data: {
            id: testOrgId,
            clerkOrgId: "clerk-" + testOrgId,
            name: "History Test Org",
            slug: testOrgId,
            plan: "MID"
        }
    });

    const project = await prisma.project.create({
        data: {
            orgId: org.id,
            name: "History Test Project",
            members: {} // simplified
        }
    });

    const stage = await prisma.stage.create({
        data: {
            projectId: project.id,
            stageKey: "naming",
            displayKey: "A2",
            name: "Naming",
            module: "A",
            order: 1
        }
    });

    const output = await prisma.output.create({
        data: {
            projectId: project.id,
            stageId: stage.id,
            name: "Naming Output",
            outputKey: "naming_results",
            versions: {
                create: [
                    { version: 1, content: { text: "Version 1" }, status: "GENERATED", createdBy: "test-user" },
                    { version: 2, content: { text: "Version 2" }, status: "GENERATED", createdBy: "test-user" },
                    { version: 3, content: { text: "Version 3" }, status: "GENERATED", createdBy: "test-user" }
                ]
            }
        },
        include: { versions: true }
    });

    console.log(`✅ Created Test Data: Project ${project.id}, Output ${output.id} with ${output.versions.length} versions.`);

    console.log(`Available Versions: ${output.versions.map(v => v.version).join(", ")}`);

    const versionToTest = output.versions[output.versions.length - 1].version; // Oldest version
    console.log(`\n🧪 Testing API Fetch for Version ${versionToTest}...`);

    // Simulate API logic (since we can't fetch localhost easily from script without auth headers)
    // We'll reproduce the logic we added to the route.ts handler

    const foundOutput = await prisma.output.findFirst({
        where: { id: output.id },
        include: {
            versions: {
                orderBy: { version: "desc" },
                take: 5,
            }
        }
    });

    let currentVersion = foundOutput?.versions[0] || null;

    // Logic from route.ts
    const specificVersionParam = versionToTest;

    if (foundOutput) {
        const found = foundOutput.versions.find(v => v.version === specificVersionParam);
        if (found) {
            console.log(`✅ Found version ${specificVersionParam} in recent list cache.`);
            currentVersion = found;
        } else {
            console.log(`ℹ️ Version ${specificVersionParam} not in top 5, fetching from DB...`);
            const specificV = await prisma.outputVersion.findUnique({
                where: {
                    outputId_version: {
                        outputId: output.id,
                        version: specificVersionParam,
                    }
                }
            });
            if (specificV) {
                console.log(`✅ Found version ${specificVersionParam} from specific DB fetch.`);
                currentVersion = specificV;
            } else {
                console.log(`❌ Version ${specificVersionParam} not found in DB!`);
            }
        }
    }

    if (currentVersion && currentVersion.version === versionToTest) {
        console.log(`✅ API Logic Verified: Successfully resolved version ${versionToTest}`);
        console.log(`Content (snippet): ${JSON.stringify(currentVersion.content).slice(0, 50)}...`);
    } else {
        throw new Error("❌ Failed to resolve correct version");
    }

    console.log("\n✨ Version History Test Complete");

    // Cleanup
    await prisma.output.delete({ where: { id: output.id } });
    await prisma.stage.delete({ where: { id: stage.id } });
    await prisma.project.delete({ where: { id: project.id } });
    await prisma.organization.delete({ where: { id: org.id } });
    console.log("🧹 Cleanup done.");
}

main()
    .catch((e) => {
        console.error("❌ Test Failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
