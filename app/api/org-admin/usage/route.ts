
import { requireOrgAdmin } from "@/lib/admin/adminAuth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { error, orgId } = await requireOrgAdmin();
    if (error) return error;

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");

    try {
        // Get generic Usage records OR AI Token usage records?
        // Schema has `Usage` model (Token Usage Tracking) and `UsageRecord` (Stripe billing).
        // User asked for: "Ver tokens usados... input/output, cost estimated" -> This is `Usage` model.

        const usage = await prisma.usage.findMany({
            where: { orgId: orgId! },
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
                id: true,
                createdAt: true,
                provider: true,
                model: true,
                inputTokens: true,
                outputTokens: true,
                totalTokens: true,
                stageKey: true,
                projectId: true
            }
        });

        // Current totals
        const org = await prisma.organization.findUnique({
            where: { id: orgId! },
            select: {
                monthlyTokenLimit: true,
                bonusTokens: true,
                monthlyTokensUsed: true,
                tokenResetDate: true,
                plan: true
            }
        });

        return NextResponse.json({
            records: usage,
            summary: org
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
