
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { addBonusTokens } from "@/lib/usage";

const ADDON_SIZE = 500000;

export async function POST(request: NextRequest) {
    try {
        const { userId, orgId } = await auth();

        if (!userId || !orgId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const org = await prisma.organization.findUnique({
            where: { clerkOrgId: orgId },
            select: { id: true, plan: true }
        });

        if (!org) {
            return NextResponse.json({ error: "Org not found" }, { status: 404 });
        }

        // Logic Check: Only MID/PRO can buy add-ons
        if (org.plan === "BASIC") {
            return NextResponse.json({
                error: "Basic plan cannot purchase add-ons. Please upgrade."
            }, { status: 403 });
        }

        // Action: Add Tokens (Simulated Purchase)
        const result = await addBonusTokens(org.id, ADDON_SIZE);

        return NextResponse.json({
            ok: true,
            bonusTokens: result.newTotal,
            added: ADDON_SIZE,
            message: `Purchased ${ADDON_SIZE} tokens successfully.`
        });

    } catch (error) {
        console.error("[Addon] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
