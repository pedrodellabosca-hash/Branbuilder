import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

// GET /api/jobs/[id] - Get job status
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId, orgId } = await auth();

        if (!userId || !orgId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { id: jobId } = await params;

        // Get org from our DB
        const org = await prisma.organization.findUnique({
            where: { clerkOrgId: orgId },
        });

        if (!org) {
            return NextResponse.json(
                { error: "Organización no encontrada" },
                { status: 404 }
            );
        }

        // Get job - must belong to this org (multi-tenant)
        const job = await prisma.job.findFirst({
            where: {
                id: jobId,
                orgId: org.id,
            },
            select: {
                id: true,
                type: true,
                status: true,
                progress: true,
                result: true,
                error: true,
                createdAt: true,
                startedAt: true,
                completedAt: true,
            },
        });

        if (!job) {
            return NextResponse.json(
                { error: "Job no encontrado" },
                { status: 404 }
            );
        }

        return NextResponse.json(job);
    } catch (error) {
        console.error("Error fetching job:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
