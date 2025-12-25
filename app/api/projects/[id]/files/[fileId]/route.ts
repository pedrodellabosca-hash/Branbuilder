import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";

interface RouteParams {
    params: Promise<{ id: string; fileId: string }>;
}

/**
 * GET /api/projects/[id]/files/[fileId] - Get file details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { userId, orgId } = await auth();
        const { id: projectId, fileId } = await params;

        if (!userId || !orgId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        // Get org
        const org = await prisma.organization.findUnique({
            where: { clerkOrgId: orgId },
        });

        if (!org) {
            return NextResponse.json(
                { error: "Organización no encontrada" },
                { status: 404 }
            );
        }

        // Get file with multi-tenant validation
        const file = await prisma.libraryFile.findFirst({
            where: {
                id: fileId,
                projectId,
                status: { not: "DELETED" },
                project: {
                    orgId: org.id,
                },
            },
            include: {
                project: {
                    select: { id: true, name: true },
                },
            },
        });

        if (!file) {
            return NextResponse.json(
                { error: "Archivo no encontrado" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            id: file.id,
            filename: file.originalName,
            mimeType: file.mimeType,
            size: file.size,
            status: file.status,
            uploadedBy: file.uploadedBy,
            project: file.project,
            createdAt: file.createdAt,
        });
    } catch (error) {
        console.error("Error getting file:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/projects/[id]/files/[fileId] - Delete a file
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { userId, orgId } = await auth();
        const { id: projectId, fileId } = await params;

        if (!userId || !orgId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        // Get org
        const org = await prisma.organization.findUnique({
            where: { clerkOrgId: orgId },
        });

        if (!org) {
            return NextResponse.json(
                { error: "Organización no encontrada" },
                { status: 404 }
            );
        }

        // Get file with multi-tenant validation
        const file = await prisma.libraryFile.findFirst({
            where: {
                id: fileId,
                projectId,
                status: { not: "DELETED" },
                project: {
                    orgId: org.id,
                },
            },
        });

        if (!file) {
            return NextResponse.json(
                { error: "Archivo no encontrado" },
                { status: 404 }
            );
        }

        // Delete from storage
        await storage.delete(file.storageKey);

        // Soft delete in database
        await prisma.libraryFile.update({
            where: { id: fileId },
            data: { status: "DELETED" },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting file:", error);
        return NextResponse.json(
            { error: "Error eliminando archivo" },
            { status: 500 }
        );
    }
}
