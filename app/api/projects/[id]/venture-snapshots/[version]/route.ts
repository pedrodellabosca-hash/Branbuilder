import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { ventureSnapshotService } from "@/lib/venture/VentureSnapshotService";
import { businessPlanService } from "@/lib/business-plan/BusinessPlanService";

interface RouteParams {
    params: Promise<{ id: string; version: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { userId, orgId } = await auth();
        const { id: projectId, version } = await params;

        if (!userId || !orgId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const parsedVersion = Number(version);
        if (!Number.isInteger(parsedVersion) || parsedVersion < 1) {
            return NextResponse.json({ error: "Versión inválida" }, { status: 400 });
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

        const snapshot = await ventureSnapshotService.getSnapshotByProjectAndVersion(
            projectId,
            parsedVersion
        );

        if (!snapshot) {
            return NextResponse.json({ error: "Snapshot no encontrado" }, { status: 404 });
        }

        const businessPlan = await businessPlanService.getBusinessPlanBySnapshotId(snapshot.id);

        return NextResponse.json({
            snapshot,
            businessPlanId: businessPlan?.id ?? null,
        });
    } catch (error) {
        console.error("Error fetching venture snapshot:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
