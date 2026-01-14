
import { requireSuperAdmin } from "@/lib/admin/adminAuth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
    const { error: authError, userId } = await requireSuperAdmin();
    if (authError) return authError;

    try {
        const body = await req.json();
        const { stage, projectId, regenerate } = body;

        if (!stage || !projectId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Verify Project Exists
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { org: true }
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // 2. Enqueue Job
        const jobId = uuidv4();
        await prisma.job.create({
            data: {
                id: jobId,
                type: "GENERATE_OUTPUT",
                status: "QUEUED",
                orgId: project.orgId,
                projectId: project.id,
                stage: stage,
                payload: {
                    stage: stage,
                    regenerate: !!regenerate
                }
            }
        });

        return NextResponse.json({
            success: true,
            jobId,
            status: "QUEUED",
            message: `Stage ${stage} for project ${project.name} enqueued successfully.`
        });

    } catch (e: any) {
        console.error("[AdminAction] Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
