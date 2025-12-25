import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";

// Max file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * GET /api/files - List files for a project
 * Query params: projectId (required)
 */
export async function GET(request: NextRequest) {
    try {
        const { userId, orgId } = await auth();

        if (!userId || !orgId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get("projectId");

        if (!projectId) {
            return NextResponse.json(
                { error: "projectId es requerido" },
                { status: 400 }
            );
        }

        // Verify org exists and user has access
        const org = await prisma.organization.findUnique({
            where: { clerkOrgId: orgId },
        });

        if (!org) {
            return NextResponse.json(
                { error: "Organización no encontrada" },
                { status: 404 }
            );
        }

        // Verify project belongs to org (multi-tenant)
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                orgId: org.id,
                status: { not: "DELETED" },
            },
        });

        if (!project) {
            return NextResponse.json(
                { error: "Proyecto no encontrado" },
                { status: 404 }
            );
        }

        // Get files
        const files = await prisma.libraryFile.findMany({
            where: {
                projectId,
                status: { not: "DELETED" },
            },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                filename: true,
                originalName: true,
                mimeType: true,
                size: true,
                status: true,
                uploadedBy: true,
                createdAt: true,
            },
        });

        return NextResponse.json(files);
    } catch (error) {
        console.error("Error listing files:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/files - Upload a file
 * Form data: file (File), projectId (string)
 */
export async function POST(request: NextRequest) {
    try {
        const { userId, orgId } = await auth();

        if (!userId || !orgId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        // Parse multipart form data
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const projectId = formData.get("projectId") as string | null;

        if (!file) {
            return NextResponse.json(
                { error: "Archivo es requerido" },
                { status: 400 }
            );
        }

        if (!projectId) {
            return NextResponse.json(
                { error: "projectId es requerido" },
                { status: 400 }
            );
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: "Archivo demasiado grande (máx 50MB)" },
                { status: 400 }
            );
        }

        // Verify org exists
        const org = await prisma.organization.findUnique({
            where: { clerkOrgId: orgId },
        });

        if (!org) {
            return NextResponse.json(
                { error: "Organización no encontrada" },
                { status: 404 }
            );
        }

        // Verify project belongs to org (multi-tenant)
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                orgId: org.id,
                status: { not: "DELETED" },
            },
        });

        if (!project) {
            return NextResponse.json(
                { error: "Proyecto no encontrado" },
                { status: 404 }
            );
        }

        // Read file as buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Upload to storage
        const uploadResult = await storage.uploadBuffer(
            org.id,
            projectId,
            file.name,
            buffer,
            { contentType: file.type }
        );

        // Create database record
        const libraryFile = await prisma.libraryFile.create({
            data: {
                projectId,
                filename: uploadResult.key.split("/").pop() || file.name,
                originalName: file.name,
                mimeType: uploadResult.contentType,
                size: uploadResult.size,
                storageKey: uploadResult.key,
                status: "AVAILABLE",
                uploadedBy: userId,
            },
        });

        return NextResponse.json({
            id: libraryFile.id,
            filename: libraryFile.originalName,
            mimeType: libraryFile.mimeType,
            size: libraryFile.size,
            createdAt: libraryFile.createdAt,
        });
    } catch (error) {
        console.error("Error uploading file:", error);
        return NextResponse.json(
            { error: "Error subiendo archivo" },
            { status: 500 }
        );
    }
}
