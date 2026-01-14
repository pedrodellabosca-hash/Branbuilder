
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { addBonusTokens } from "@/lib/usage";

export async function POST(req: NextRequest) {
    try {
        const { userId, orgId } = await auth();
        if (!userId || !orgId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { intentId } = body;

        if (!intentId) {
            return NextResponse.json({ error: "Missing intentId" }, { status: 400 });
        }

        const org = await prisma.organization.findUnique({
            where: { clerkOrgId: orgId }
        });
        if (!org) {
            return NextResponse.json({ error: "Org not found" }, { status: 404 });
        }

        // Transaction to ensure atomicity
        const result = await prisma.$transaction(async (tx) => {
            // 1. Lock Purchase
            const purchase = await tx.tokenPurchase.findUnique({
                where: { id: intentId }
            });

            if (!purchase) {
                throw new Error("Purchase intent not found");
            }
            if (purchase.orgId !== org.id) {
                throw new Error("Unauthorized access to purchase");
            }

            // 2. Output if already completed (Idempotency)
            if (purchase.status === "COMPLETED") {
                return {
                    status: "COMPLETED",
                    alreadyDone: true,
                    tokens: purchase.tokens
                };
            }

            if (purchase.status !== "PENDING") {
                throw new Error(`Invalid status: ${purchase.status}`);
            }

            // 3. Mark Completed
            const completed = await tx.tokenPurchase.update({
                where: { id: intentId },
                data: {
                    status: "COMPLETED",
                    completedAt: new Date(),
                    metadata: {
                        ...(purchase.metadata as object), // Merge existing
                        confirmedBy: userId,
                        confirmedAt: new Date().toISOString()
                    }
                }
            });

            // 4. Add Tokens (Logic relocated here or call lib func if compatible with transaction? 
            // Since lib/usage/index.ts typically uses prisma global, we might need to pass tx or replicate logic.
            // For simplicity/safety, we'll manually update here using the transaction instance.)

            // Replicating addBonusTokens logic within TX
            const updatedOrg = await tx.organization.update({
                where: { id: org.id },
                data: {
                    bonusTokens: { increment: purchase.tokens }
                }
            });

            // 5. Audit Log
            await tx.auditLog.create({
                data: {
                    orgId: org.id,
                    userId,
                    action: "ADDON_PURCHASED",
                    resource: "TokenPurchase",
                    resourceId: purchase.id,
                    metadata: { tokens: purchase.tokens, newBalance: updatedOrg.bonusTokens }
                }
            });

            return {
                status: "COMPLETED",
                alreadyDone: false,
                tokens: purchase.tokens,
                newBonusTokens: updatedOrg.bonusTokens
            };
        });

        if ((result as any).alreadyDone) {
            return NextResponse.json({
                ok: true,
                status: "COMPLETED",
                message: "Purchase already completed previously"
            });
        }

        return NextResponse.json({
            ok: true,
            status: "COMPLETED",
            tokensAdded: result.tokens
        });

    } catch (error: any) {
        console.error("[Addon Confirm] Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 400 });
    }
}
