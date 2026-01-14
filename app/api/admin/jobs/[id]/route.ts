
import { requireSuperAdmin } from "@/lib/admin/adminAuth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { error } = await requireSuperAdmin();
    if (error) return error;

    const { id } = await params;

    try {
        const job = await prisma.job.findUnique({
            where: { id }
        });

        if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        return NextResponse.json({ job });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
