import { requireProjectAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ projectId: string, jobId: string }> }
) {
    // 1. Auth & Param verification
    const { projectId, jobId } = await params;

    try {
        // Enforce access: checks org membership and project existence within org
        await requireProjectAccess(projectId, 'VIEWER');

        // 2. Fetch Job (scoped to project for security)
        const job = await prisma.job.findFirst({
            where: {
                id: jobId,
                projectId: projectId // Strict scoping
            },
            select: {
                id: true,
                status: true,
                createdAt: true,
                startedAt: true,
                completedAt: true,
                error: true,
                result: true
            }
        });

        if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        return NextResponse.json(job);

    } catch (err: any) {
        // Map common auth errors to 401/403/404
        const status =
            err.message === "Unauthorized" ? 401 :
                err.message === "Insufficient permissions" ? 403 :
                    err.message === "Project not found" ? 404 : 500;

        return NextResponse.json({ error: err.message }, { status });
    }
}
