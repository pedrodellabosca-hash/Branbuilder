
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

        if (job.status === "DONE") {
            return NextResponse.json({ error: "Cannot fail a completed job" }, { status: 400 });
        }

        // Force Fail Logic
        await prisma.job.update({
            where: { id },
            data: {
                status: "FAILED",
                error: "Manually marked as failed by Admin",
                completedAt: new Date()
            }
        });

        return NextResponse.json({ success: true, message: "Job marked as failed" });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
