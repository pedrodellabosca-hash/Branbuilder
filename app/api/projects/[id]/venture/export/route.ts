import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { buildVentureExportMarkdown } from "@/lib/venture/renderVentureExport";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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
        where: {
            id: projectId,
            orgId: org.id,
            status: { not: "DELETED" },
        },
        select: { id: true, name: true },
    });

    if (!project) {
        return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    const { markdown, filename } = await buildVentureExportMarkdown(project);

    return new NextResponse(markdown, {
        headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
}
