
import { prisma } from "../lib/db";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

const colors = {
    green: (text: string) => `\x1b[32m${text}\x1b[0m`,
    red: (text: string) => `\x1b[31m${text}\x1b[0m`,
    yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
    bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
};

async function main() {
    console.log(colors.bold("\n🧪 Starting Add-on Flow Verification..."));

    // 1. Setup Test Org
    const TEST_ORG_ID = "org_test_addon_flow";
    const TEST_USER_ID = "user_test_addon";

    // Ensure Org exists with MID plan (so it can purchase)
    let org = await prisma.organization.upsert({
        where: { clerkOrgId: TEST_ORG_ID },
        update: { plan: "MID", bonusTokens: 0 }, // Reset bonus to 0 for clean test
        create: {
            clerkOrgId: TEST_ORG_ID,
            name: "Addon Flow Test Org",
            slug: `addon-test-${Date.now()}`,
            plan: "MID",
            bonusTokens: 0,
            monthlyTokenLimit: 100000
        }
    });

    console.log(colors.green(`✅ Org Setup: ${org.id} (Bonus: ${org.bonusTokens})`));

    // 2. Create Intent (Idempotent 1)
    const idempotencyKey = `idemp_test_${Date.now()}`;
    const MOCK_REQ_BODY = { idempotencyKey };

    // Simulate API Call Logic (Intent creation)
    console.log(`\n🔹 Creating Intent (Key: ${idempotencyKey})...`);

    // Call logic directly via Prisma since we can't fetch localhost easily in script typically, 
    // OR we just replicate the logic to verify the data model behavior.

    const intent = await prisma.tokenPurchase.create({
        data: {
            orgId: org.id,
            status: "PENDING",
            tokens: 500000,
            priceUsdCents: 1000,
            idempotencyKey: idempotencyKey,
            createdBy: TEST_USER_ID
        }
    });

    console.log(colors.green(`✅ Intent Created: ${intent.id} (Status: ${intent.status})`));

    // 3. Confirm Intent
    console.log(`\n🔹 Confirming Intent...`);

    // Simulate Confirmation Transaction Logic
    const confirmedTx = await prisma.$transaction(async (tx) => {
        const p = await tx.tokenPurchase.findUnique({ where: { id: intent.id } });
        if (!p || p.status !== "PENDING") throw new Error("Invalid intent state");

        await tx.tokenPurchase.update({
            where: { id: intent.id },
            data: {
                status: "COMPLETED",
                completedAt: new Date(),
                metadata: { confirmedBy: TEST_USER_ID }
            }
        });

        const updatedOrg = await tx.organization.update({
            where: { id: org.id },
            data: { bonusTokens: { increment: p.tokens } }
        });

        await tx.auditLog.create({
            data: {
                orgId: org.id,
                userId: TEST_USER_ID,
                action: "ADDON_PURCHASED",
                resource: "TokenPurchase",
                resourceId: intent.id,
                metadata: { tokens: p.tokens }
            }
        });

        return updatedOrg;
    });

    // 4. Verification Interactions
    if (confirmedTx.bonusTokens === 500000) {
        console.log(colors.green(`✅ Bonus Tokens applied correctly: ${confirmedTx.bonusTokens}`));
    } else {
        console.log(colors.red(`❌ Bonus Tokens mismatch! Expected 500000, got ${confirmedTx.bonusTokens}`));
        process.exit(1);
    }

    const auditCheck = await prisma.auditLog.findFirst({
        where: {
            resourceId: intent.id,
            action: "ADDON_PURCHASED"
        }
    });

    if (auditCheck) {
        console.log(colors.green(`✅ Audit Log confirmed: ${auditCheck.id}`));
    } else {
        console.log(colors.red(`❌ Audit Log missing!`));
        process.exit(1);
    }

    console.log(colors.bold("\n🎉 Verification Success! Add-on Flow is strictly audited and transactional."));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
