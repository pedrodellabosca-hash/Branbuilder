import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/files/[id]/download - Download a file
 * Returns the file as a stream with proper headers
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { userId, orgId } = await auth();
        const { id: fileId } = await params;

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

        // Get file stream from storage
        const stream = await storage.getStream(file.storageKey);

        if (!stream) {
            return NextResponse.json(
                { error: "Archivo no encontrado en storage" },
                { status: 404 }
            );
        }

        // Convert Node.js Readable to Web ReadableStream
        const webStream = new ReadableStream({
            start(controller) {
                stream.on("data", (chunk) => {
                    controller.enqueue(chunk);
                });
                stream.on("end", () => {
                    controller.close();
                });
                stream.on("error", (err) => {
                    controller.error(err);
                });
            },
        });

        // Return file with proper headers
        return new NextResponse(webStream, {
            headers: {
                "Content-Type": file.mimeType,
                "Content-Disposition": `attachment; filename="${encodeURIComponent(file.originalName)}"`,
                "Content-Length": file.size.toString(),
                "Cache-Control": "private, max-age=3600",
            },
        });
    } catch (error) {
        console.error("Error downloading file:", error);
        return NextResponse.json(
            { error: "Error descargando archivo" },
            { status: 500 }
        );
    }
}
