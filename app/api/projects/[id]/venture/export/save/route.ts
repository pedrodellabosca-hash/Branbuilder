import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { buildVentureExportMarkdown } from "@/lib/venture/renderVentureExport";

export async function POST(
    request: Request,
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

    const { markdown, filename, done, doneApproved } = await buildVentureExportMarkdown(project);
    const buffer = Buffer.from(markdown, "utf8");

    const existing = await prisma.libraryFile.findMany({
        where: { projectId },
        select: { metadata: true },
    });

    const version =
        existing.filter((file) => (file.metadata as { type?: string } | null)?.type === "venture_fundamentos_export")
            .length + 1;

    const baseName = filename.replace(/\.md$/i, "");
    const originalName = `${baseName}-v${version}.md`;

    const uploadResult = await storage.uploadBuffer(
        org.id,
        projectId,
        originalName,
        buffer,
        {
            contentType: "text/markdown",
            metadata: {
                type: "venture_fundamentos_export",
                format: "markdown",
                done,
                doneApproved,
                version,
                createdAt: new Date().toISOString(),
            },
        }
    );

    const libraryFile = await prisma.libraryFile.create({
        data: {
            projectId,
            filename: uploadResult.key.split("/").pop() || originalName,
            originalName,
            mimeType: uploadResult.contentType,
            size: uploadResult.size,
            storageKey: uploadResult.key,
            status: "AVAILABLE",
            uploadedBy: userId,
            metadata: {
                type: "venture_fundamentos_export",
                format: "markdown",
                done,
                doneApproved,
                version,
                createdAt: new Date().toISOString(),
            },
        },
    });

    return NextResponse.json({ itemId: libraryFile.id, version });
}
