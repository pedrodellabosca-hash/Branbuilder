import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { userId, orgId } = await auth();
        const { id: projectId } = await params;

        if (!userId || !orgId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const jobId = request.nextUrl.searchParams.get("jobId");
        if (!jobId) {
            return NextResponse.json({ error: "jobId requerido" }, { status: 400 });
        }

        const org = await prisma.organization.findUnique({
            where: { clerkOrgId: orgId },
            select: { id: true },
        });

        if (!org) {
            return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
        }

        const project = await prisma.project.findFirst({
            where: { id: projectId, orgId: org.id, status: { not: "DELETED" } },
            select: { id: true },
        });

        if (!project) {
            return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
        }

        const job = await prisma.job.findFirst({
            where: { id: jobId, projectId: project.id, orgId: org.id },
            select: {
                status: true,
                progress: true,
                error: true,
                result: true,
            },
        });

        if (!job) {
            return NextResponse.json({ error: "Job no encontrado" }, { status: 404 });
        }

        const result = job.result as Record<string, unknown> | null;
        const message =
            (result?.message as string | undefined) ||
            job.error ||
            null;

        return NextResponse.json({
            status: job.status,
            progress: job.progress,
            message,
            latestSnapshotVersion: result?.latestSnapshotVersion ?? null,
            successCount: result?.successCount ?? null,
            failureCount: result?.failureCount ?? null,
        });
    } catch (error) {
        console.error("Error fetching business plan job status:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
