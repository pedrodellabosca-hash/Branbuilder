
import "dotenv/config";
import { prisma } from "../lib/db";
import { checkTokenBudget, addBonusTokens, resetMonthlyUsageIfNeeded } from "../lib/usage";

// Hardcoded for test
const ORG_ID = "org_2q2082260173641321703649536"; // Use an existing valid org ID from your DB or fetch one
// Or better, create a temporary org

async function runTest() {
    console.log("🚀 Starting Token Gating Verification...");

    // 1. Setup: Get or Create Test Org
    const testOrgId = "test_org_gating_" + Date.now();

    // We need a real org ID logic if we want to hit the API, or we can mock/insert directly into DB
    // Let's use a fresh org inserted directly
    const org = await prisma.organization.upsert({
        where: { clerkOrgId: "test_clerk_gating" },
        update: {},
        create: {
            clerkOrgId: "test_clerk_gating",
            name: "Gating Test Org",
            slug: "gating-test-org", // Added slug
            plan: "MID", // Allow purchases
            monthlyTokenLimit: 100, // Very low limit
            monthlyTokensUsed: 0,
            bonusTokens: 0,
            tokenResetDate: new Date(),
        }
    });

    console.log(`✅ Test Org Ready: ${org.id} (Plan: ${org.plan})`);

    // 2. Set Usage to Near Limit
    await prisma.organization.update({
        where: { id: org.id },
        data: {
            monthlyTokensUsed: 99, // 1 token left
            bonusTokens: 0,
            monthlyTokenLimit: 100
        }
    });

    // 3. Check Budget (Should Fail for a 2000 token stage)
    console.log("🔍 Checking Budget (Should Fail)...");
    const budgetFail = await checkTokenBudget(org.id, 2000);

    if (!budgetFail.allowed) {
        console.log("✅ Blocked correctly:", budgetFail);
    } else {
        console.error("❌ Should have been blocked!", budgetFail);
        process.exit(1);
    }

    // 4. Simulate Add-on Purchase
    console.log("💰 Purchasing Add-on...");
    await addBonusTokens(org.id, 5000);

    const freshOrg = await prisma.organization.findUnique({ where: { id: org.id } });
    console.log(`✅ Tokens Added. Bonus: ${freshOrg?.bonusTokens}, Total Available: ${(freshOrg?.monthlyTokenLimit || 0) - (freshOrg?.monthlyTokensUsed || 0) + (freshOrg?.bonusTokens || 0)}`);

    // 5. Check Budget (Should Pass)
    console.log("🔍 Checking Budget (Should Pass)...");
    const budgetPass = await checkTokenBudget(org.id, 2000);

    if (budgetPass.allowed) {
        console.log("✅ Allowed correctly:", budgetPass);
    } else {
        console.error("❌ Should have been allowed!", budgetPass);
        process.exit(1);
    }

    console.log("🎉 Verification Complete: Token Gating Logic works.");
}

runTest()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
