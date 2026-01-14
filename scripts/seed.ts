
import { PrismaClient, Module, StageStatus } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Starting Database Seed...");

    // 1. Create Organization (if not exists)
    // We use a fixed Clerk ID for predictability in dev
    const CLERK_ORG_ID = "org_2rGg...seed"; // Dummy, typical Clerk ID format
    const ORG_SLUG = "seed-agency";

    const org = await prisma.organization.upsert({
        where: { slug: ORG_SLUG },
        update: {},
        create: {
            clerkOrgId: CLERK_ORG_ID,
            name: "Seed Agency Ltd.",
            slug: ORG_SLUG,
            plan: "PRO",
            mfaRequired: false,
            monthlyTokenLimit: 500000,
        }
    });
    console.log(`✅ Organization: ${org.name} (${org.id})`);

    // 2. Create User (Simulated, as we don't allow creating Clerk users directly here easily without admin key)
    // In local dev, you usually sign in via Clerk. 
    // This seed mainly sets up the DB side. 
    // We will assume 'user_seed_owner' is the ID you might use in Mock Mode or link manually.
    const USER_ID = "user_seed_owner";

    // Ensure Org Member
    const member = await prisma.orgMember.upsert({
        where: {
            orgId_userId: {
                orgId: org.id,
                userId: USER_ID,
            }
        },
        update: { role: "OWNER" },
        create: {
            orgId: org.id,
            userId: USER_ID,
            email: "owner@seed.test",
            role: "OWNER",
        }
    });
    console.log(`✅ Org Member: ${member.email} (${member.role})`);

    // 3. Create Project
    const project = await prisma.project.create({
        data: {
            orgId: org.id,
            name: "Seed Brand Project",
            status: "IN_PROGRESS",
            moduleA: true,
            moduleB: false,
            members: {
                create: {
                    userId: USER_ID,
                    email: "owner@seed.test",
                    role: "PROJECT_OWNER"
                }
            }
        }
    });
    console.log(`✅ Project: ${project.name} (${project.id})`);

    // 4. Create Mock Output (Output + Version)
    // Note: We deliberately OMIT stageId here and let stage.create handle the relation.
    const output = await prisma.output.create({
        data: {
            project: { connect: { id: project.id } },
            stage: {
                create: {
                    projectId: project.id,
                    module: Module.A,
                    stageKey: "naming",
                    name: "Naming Generation",
                    order: 1,
                    status: StageStatus.GENERATED
                }
            },
            name: "Naming Options",
            outputKey: "naming",
        }
    });

    await prisma.outputVersion.create({
        data: {
            outputId: output.id,
            version: 1,
            type: "GENERATED",
            status: "GENERATED",
            provider: "MOCK",
            model: "mock-v1",
            content: {
                title: "Naming Exploration",
                options: [
                    { name: "BrandSeed", rationale: "Roots and growth." },
                    { name: "CoreFlow", rationale: "Central energy." }
                ]
            },
            createdBy: USER_ID,
        }
    });
    console.log(`✅ Output: ${output.name} with v1`);

    console.log("\n🌱 Seed Complete!");
}

main()
    .catch((e) => {
        console.error("❌ Seed Failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
