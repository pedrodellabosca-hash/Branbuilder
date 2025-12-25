import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

interface RouteParams {
    params: Promise<{ id: string; stageId: string }>;
}

/**
 * POST /api/projects/[id]/stages/[stageId]/approve
 * Approves a stage (changes status to APPROVED)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { userId, orgId } = await auth();
        const { id: projectId, stageId } = await params;

        if (!userId || !orgId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        // Get org for multi-tenant validation
        const org = await prisma.organization.findUnique({
            where: { clerkOrgId: orgId },
        });

        if (!org) {
            return NextResponse.json(
                { error: "Organización no encontrada" },
                { status: 404 }
            );
        }

        // Get stage with multi-tenant check
        const stage = await prisma.stage.findFirst({
            where: {
                id: stageId,
                projectId,
                project: {
                    orgId: org.id,
                    status: { not: "DELETED" },
                },
            },
        });

        if (!stage) {
            return NextResponse.json(
                { error: "Etapa no encontrada" },
                { status: 404 }
            );
        }

        // Check if stage can be approved
        if (stage.status !== "GENERATED" && stage.status !== "REGENERATED") {
            return NextResponse.json(
                { error: "Solo se pueden aprobar etapas generadas" },
                { status: 400 }
            );
        }

        // Update stage status to APPROVED
        const updatedStage = await prisma.stage.update({
            where: { id: stageId },
            data: { status: "APPROVED" },
        });

        return NextResponse.json({
            success: true,
            stage: {
                id: updatedStage.id,
                status: updatedStage.status,
            },
        });
    } catch (error) {
        console.error("Error approving stage:", error);
        return NextResponse.json(
            { error: "Error aprobando etapa" },
            { status: 500 }
        );
    }
}
