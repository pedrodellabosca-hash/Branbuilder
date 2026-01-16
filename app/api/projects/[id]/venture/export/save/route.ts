import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { buildVentureExportMarkdown } from "@/lib/venture/renderVentureExport";
import { Prisma } from "@prisma/client";

const MAX_ATTEMPTS = 2;

function generateSuffix() {
    return Math.random().toString(36).slice(2, 8);
}

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

    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const suffix = generateSuffix();
        let uploadKey: string | null = null;

        try {
            const result = await prisma.$transaction(async (tx) => {
                const existing = await tx.libraryFile.findMany({
                    where: { projectId },
                    select: { metadata: true },
                });

                const version =
                    existing.filter(
                        (file) => (file.metadata as { type?: string } | null)?.type === "venture_fundamentos_export"
                    ).length + 1;

                const baseName = filename.replace(/\.md$/i, "");
                const originalName = `${baseName}-v${version}-${suffix}.md`;

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
                            filenameSuffix: suffix,
                            createdAt: new Date().toISOString(),
                        },
                    }
                );

                uploadKey = uploadResult.key;

                const libraryFile = await tx.libraryFile.create({
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
                            filenameSuffix: suffix,
                            createdAt: new Date().toISOString(),
                        },
                    },
                });

                return { itemId: libraryFile.id, version };
            });

            return NextResponse.json(result);
        } catch (error) {
            lastError = error;
            if (uploadKey) {
                try {
                    await storage.delete(uploadKey);
                } catch (deleteError) {
                    console.warn("Failed to cleanup venture export upload", deleteError);
                }
            }
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                continue;
            }
            break;
        }
    }

    return NextResponse.json({ error: "Version conflict while saving export" }, { status: 409 });
}
