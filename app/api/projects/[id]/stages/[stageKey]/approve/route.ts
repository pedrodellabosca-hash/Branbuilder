import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; stageKey: string }> }
) {
    try {
        const { userId, orgId } = await auth();

        if (!userId || !orgId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id: projectId, stageKey } = await params;

        // Verify project/org access
        const project = await prisma.project.findFirst({
            where: { id: projectId, orgId: (await prisma.organization.findUnique({ where: { clerkOrgId: orgId } }))?.id },
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Find stage
        const stage = await prisma.stage.findFirst({
            where: { projectId, stageKey },
        });

        if (!stage) {
            return NextResponse.json({ error: "Stage not found" }, { status: 404 });
        }

        // Update Stage Status
        await prisma.stage.update({
            where: { id: stage.id },
            data: { status: "APPROVED" },
        });

        // Find latest output version and mark it APPROVED too if needed
        // (Optional based on business logic, but good for tracking which version was approved)
        const output = await prisma.output.findFirst({
            where: { stageId: stage.id },
            include: { versions: { orderBy: { version: "desc" }, take: 1 } },
        });

        if (output && output.versions[0]) {
            await prisma.outputVersion.update({
                where: { id: output.versions[0].id },
                data: { status: "APPROVED" },
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("[Stage Approve] Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
