
import { requireSuperAdmin } from "@/lib/admin/adminAuth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { error } = await requireSuperAdmin();
    if (error) return error;

    const { id } = await params;

    try {
        const job = await prisma.job.findUnique({ where: { id } });
        if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

        if (!job.projectId) {
            return NextResponse.json({ error: "Job is not associated with a project" }, { status: 400 });
        }

        // Try to find output associated with project
        // Note: Job doesn't have direct link to Output ID in this schema yet, 
        // so we infer based on stage/project/time or if payload has link.
        // For V3, let's find the Output that matches the stage and project, 
        // and ideally created AFTER the job started.

        // Simpler approach: Find output for this project/stage (Latest)
        if (!job.stage) {
            return NextResponse.json({ error: "Job has no stage" }, { status: 400 });
        }

        const output = await prisma.output.findFirst({
            where: {
                projectId: job.projectId,
                outputKey: job.stage // Assumption: outputKey usually maps to stageKey in this system
            },
            include: {
                versions: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        if (!output) {
            return NextResponse.json({ output: null, message: "No output found for this stage" });
        }

        return NextResponse.json({ output });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
