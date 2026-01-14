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
        const body = await request.json();
        const { versionId } = body;

        // Guard removed: Generalized for all stages

        if (!versionId) {
            return NextResponse.json({ error: "Missing versionId" }, { status: 400 });
        }

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

        // Find output to verify version belongs to it
        const output = await prisma.output.findFirst({
            where: { stageId: stage.id }
        });

        if (!output) {
            return NextResponse.json({ error: "Output not found" }, { status: 404 });
        }

        // Execute changes transactionally
        await prisma.$transaction(async (tx) => {
            // 1. Approve target version
            const updated = await tx.outputVersion.update({
                where: { id: versionId },
                data: {
                    status: "APPROVED",
                    // We could store approvedBy here if schema allows, assumed existing flow does basic status 
                }
            });

            if (updated.outputId !== output.id) {
                throw new Error("Version does not belong to this stage");
            }

            // 2. Mark other APPROVED versions as OBSOLETE
            await tx.outputVersion.updateMany({
                where: {
                    outputId: output.id,
                    status: "APPROVED",
                    id: { not: versionId }
                },
                data: { status: "OBSOLETE" }
            });

            // 3. Update Stage Status
            await tx.stage.update({
                where: { id: stage.id },
                data: { status: "APPROVED" },
            });
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("[Stage Approve] Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
