import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { ventureSnapshotService } from "@/lib/venture/VentureSnapshotService";

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

        const fromParam = request.nextUrl.searchParams.get("from");
        const toParam = request.nextUrl.searchParams.get("to");
        const fromVersion = Number(fromParam);
        const toVersion = Number(toParam);

        if (
            !fromParam ||
            !toParam ||
            !Number.isInteger(fromVersion) ||
            !Number.isInteger(toVersion) ||
            fromVersion < 1 ||
            toVersion < 1
        ) {
            return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
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

        const diff = await ventureSnapshotService.compareSnapshots(
            projectId,
            fromVersion,
            toVersion
        );

        if (!diff) {
            return NextResponse.json({ error: "Snapshot no encontrado" }, { status: 404 });
        }

        return NextResponse.json(diff);
    } catch (error) {
        console.error("Error comparing venture snapshots:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
