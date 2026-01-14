
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const { userId, orgId } = await auth();
        if (!userId || !orgId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { idempotencyKey } = body;

        if (!idempotencyKey) {
            return NextResponse.json({ error: "Missing idempotencyKey" }, { status: 400 });
        }

        // 1. Resolve Org & Plan Config
        const org = await prisma.organization.findUnique({
            where: { clerkOrgId: orgId },
            include: { tokenPurchases: true } // check duplications broadly if needed, but idempotencyKey is mostly global/unique
        });

        if (!org) {
            return NextResponse.json({ error: "Organization not found" }, { status: 404 });
        }

        // Get Plan Config (or hardcode for now if PlanConfig table empty)
        // For MVP we use fixed values as per previous code
        const ADDON_TOKENS = 500000;
        const PRICE_CENTS = 1000; // $10.00

        // Only MID/PRO can buy
        if (org.plan === "BASIC") {
            return NextResponse.json({
                error: "Basic plan cannot purchase add-ons. Upgrade required."
            }, { status: 403 });
        }

        // 2. Check Idempotency
        const existing = await prisma.tokenPurchase.findUnique({
            where: { idempotencyKey }
        });

        if (existing) {
            // Verify org matches
            if (existing.orgId !== org.id) {
                return NextResponse.json({ error: "Idempotency key conflict" }, { status: 409 });
            }
            return NextResponse.json({
                intentId: existing.id,
                status: existing.status,
                tokens: existing.tokens,
                priceUsdCents: existing.priceUsdCents,
                message: "Existing intent retrieved"
            });
        }

        // 3. Create Intent
        const purchase = await prisma.tokenPurchase.create({
            data: {
                orgId: org.id,
                status: "PENDING",
                tokens: ADDON_TOKENS,
                priceUsdCents: PRICE_CENTS,
                idempotencyKey,
                createdBy: userId,
                metadata: {
                    source: "API",
                    userAgent: req.headers.get("user-agent")
                }
            }
        });

        // Audit Log
        await prisma.auditLog.create({
            data: {
                orgId: org.id,
                userId,
                action: "ADDON_INTENT_CREATED",
                resource: "TokenPurchase",
                resourceId: purchase.id,
                metadata: { tokens: ADDON_TOKENS, price: PRICE_CENTS }
            }
        });

        return NextResponse.json({
            intentId: purchase.id,
            status: "PENDING",
            tokens: ADDON_TOKENS,
            priceUsdCents: PRICE_CENTS
        });

    } catch (error: any) {
        console.error("[Addon Intent] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
