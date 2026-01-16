import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { ventureSnapshotService } from "@/lib/venture/VentureSnapshotService";
import { SectionConflictError } from "@/lib/business-plan/BusinessPlanSectionService";
import { Prisma } from "@prisma/client";

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

        let body: unknown = null;
        try {
            body = await request.json();
        } catch {
            body = {};
        }
        const seedTemplate = Boolean((body as { seedTemplate?: boolean } | null)?.seedTemplate);

        const { snapshot, businessPlan } = await ventureSnapshotService.createSnapshotWithSeed(
            projectId,
            seedTemplate
        );

        return NextResponse.json(
            {
                snapshot,
                businessPlan: {
                    id: businessPlan.id,
                    projectId: businessPlan.projectId,
                    ventureSnapshotId: businessPlan.sourceSnapshotId,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof SectionConflictError) {
            return NextResponse.json({ error: "Sección ya existe" }, { status: 409 });
        }
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return NextResponse.json({ error: "Conflicto de versión" }, { status: 409 });
        }
        console.error("Error creating venture snapshot:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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

        const snapshots = await ventureSnapshotService.listSnapshotsByProject(projectId);

        return NextResponse.json({ snapshots });
    } catch (error) {
        console.error("Error listing venture snapshots:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
