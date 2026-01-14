
import { SubscriptionService } from "@/lib/billing/subscription";
import { prisma } from "@/lib/db";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function main() {
    console.log("🧪 Starting Billing Verification...");

    // 1. Setup Test Data (Org with limit)
    const org = await prisma.organization.findFirst();
    if (!org) throw new Error("No org found (run seed first)");

    console.log(`   Using Org: ${org.name} (${org.id})`);
    console.log(`   Current Limit: ${org.monthlyTokenLimit}, Used: ${org.monthlyTokensUsed}`);

    // 2. Test Check Usage (Should pass)
    console.log("2. Testing Safe Usage...");
    try {
        await SubscriptionService.checkUsage(org.id, 100);
        console.log("   ✅ Safe usage allowed");
    } catch (e) {
        console.error("   ❌ Safe usage failed:", e);
        process.exit(1);
    }

    // 3. Test Usage Enforcement (Exceed Limit)
    console.log("3. Testing Limit Enforcement...");
    const crazyAmount = 1_000_000_000;
    try {
        await SubscriptionService.checkUsage(org.id, crazyAmount);
        console.error("   ❌ Failed to block excessive usage");
        process.exit(1);
    } catch (e: any) {
        if (e.message.includes("limit exceeded")) {
            console.log("   ✅ Limit enforced correctly");
        } else {
            console.error("   ❌ Unexpected error:", e);
            process.exit(1);
        }
    }

    // 4. Test Usage Recording
    console.log("4. Testing Usage Recording...");
    const initialUsed = org.monthlyTokensUsed;
    await SubscriptionService.recordUsage(org.id, 500, {
        provider: "MOCK",
        model: "mock-v1"
    });

    const updatedOrg = await prisma.organization.findUnique({ where: { id: org.id } });
    if (updatedOrg && updatedOrg.monthlyTokensUsed === initialUsed + 500) {
        console.log("   ✅ Usage recorded correctly");
    } else {
        console.error("   ❌ Usage recording failed. Expected +500.");
        process.exit(1);
    }

    console.log("\n✅ Billing Logic Verified!");
}

main()
    .catch((e) => {
        console.error("Verification Failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
