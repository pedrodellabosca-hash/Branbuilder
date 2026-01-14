
import { requireSuperAdmin } from "@/lib/admin/adminAuth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { error } = await requireSuperAdmin();
    if (error) return error;

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const stage = url.searchParams.get("stage");
    const status = url.searchParams.get("status");

    // Status must be enum compatible, but we use string
    const validStatuses = ["QUEUED", "PROCESSING", "DONE", "FAILED"];
    const statusFilter = status && validStatuses.includes(status) ? status : undefined;

    try {
        const where: any = {};
        if (stage) where.stage = stage;
        if (statusFilter) where.status = statusFilter;

        const jobs = await prisma.job.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit
        });

        return NextResponse.json({ jobs });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
