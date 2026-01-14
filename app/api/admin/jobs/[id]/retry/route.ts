
import { requireSuperAdmin } from "@/lib/admin/adminAuth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { error } = await requireSuperAdmin();
    if (error) return error;

    const { id } = await params;

    try {
        const job = await prisma.job.findUnique({ where: { id } });
        if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

        if (job.status !== "FAILED") {
            return NextResponse.json({ error: "Only failed jobs can be retried" }, { status: 400 });
        }

        // Standard Retry Logic: Reset status, attempts, error
        await prisma.job.update({
            where: { id },
            data: {
                status: "QUEUED",
                attempts: 0,
                error: null,
                startedAt: null,
                completedAt: null,
                lockedAt: null,
                lockedBy: null
            }
        });

        return NextResponse.json({ success: true, message: "Job requeued" });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
