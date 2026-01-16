import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { buildVentureExportMarkdown } from "@/lib/venture/renderVentureExport";
import {
    extractMarkdownMeta,
    renderVentureExportPdf,
} from "@/lib/venture/renderVentureExportPdf";

export const runtime = "nodejs";

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
        return NextResponse.json({ error: "Organizacion no encontrada" }, { status: 404 });
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
    const meta = extractMarkdownMeta(markdown);
    const pdfBuffer = await renderVentureExportPdf(markdown, {
        projectName: meta.projectName ?? project.name,
        exportDate: meta.exportDate,
    });
    const pdfFilename = filename.replace(/\.md$/i, ".pdf");

    return new NextResponse(pdfBuffer, {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${pdfFilename}"`,
        },
    });
}
