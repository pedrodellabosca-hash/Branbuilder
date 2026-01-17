import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { userId, orgId } = await auth();
        const { id: projectId } = await params;

        if (!userId || !orgId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
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

        const existingJob = await prisma.job.findFirst({
            where: {
                orgId: org.id,
                projectId,
                type: "BUSINESS_PLAN_GENERATE",
                status: { in: ["QUEUED", "PROCESSING"] },
            },
            select: { id: true },
        });

        if (existingJob) {
            return NextResponse.json(
                { error: "Ya hay una generación en curso" },
                { status: 409 }
            );
        }

        const job = await prisma.job.create({
            data: {
                orgId: org.id,
                projectId,
                type: "BUSINESS_PLAN_GENERATE",
                payload: {
                    requestedBy: userId,
                },
            },
        });

        return NextResponse.json({ jobId: job.id }, { status: 201 });
    } catch (error) {
        console.error("Error creating business plan generation job:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
