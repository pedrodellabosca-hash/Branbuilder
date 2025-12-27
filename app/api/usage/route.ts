/**
 * GET /api/usage
 * 
 * Returns the current organization's token usage summary.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getUsageSummary } from "@/lib/usage";

export async function GET() {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    // Get internal org
    const org = await prisma.organization.findUnique({
        where: { clerkOrgId: orgId },
    });

    if (!org) {
        return NextResponse.json(
            { error: "Organization not found" },
            { status: 404 }
        );
    }

    try {
        const summary = await getUsageSummary(org.id);

        return NextResponse.json({
            tokens: {
                used: summary.used,
                limit: summary.limit,
                remaining: summary.remaining,
                bonus: summary.bonusTokens,
                percentUsed: Math.round(summary.percentUsed * 10) / 10,
                // Detailed Breakdown
                raw: summary.rawUsed,
                billed: summary.billedUsed,
            },
            reset: {
                date: summary.resetDate.toISOString(),
                daysRemaining: summary.daysUntilReset,
            },
            plan: summary.plan,
            canPurchaseMore: summary.canPurchaseMore,
        });
    } catch (error) {
        console.error("[API] Error fetching usage:", error);
        return NextResponse.json(
            { error: "Failed to fetch usage" },
            { status: 500 }
        );
    }
}
