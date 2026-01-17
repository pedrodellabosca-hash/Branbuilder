import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiAuth } from "@/lib/auth/getApiAuth";
import { buildVentureExportMarkdown } from "@/lib/venture/renderVentureExport";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authContext = await getApiAuth(request);
    const { id: projectId } = await params;

    if (!authContext) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId, orgId, source } = authContext;

    const org = await prisma.organization.findUnique({
        where: { clerkOrgId: orgId },
        select: { id: true },
    });

    let project = null as { id: string; name: string } | null;
    if (org) {
        project = await prisma.project.findFirst({
            where: {
                id: projectId,
                orgId: org.id,
                status: { not: "DELETED" },
            },
            select: { id: true, name: true },
        });
    } else if (source === "e2e") {
        project = await prisma.project.findFirst({
            where: {
                id: projectId,
                status: { not: "DELETED" },
            },
            select: { id: true, name: true },
        });
    }

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
