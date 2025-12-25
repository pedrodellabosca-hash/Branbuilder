import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/projects/[id] - Get project details
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { userId, orgId } = await auth();
        const { id: projectId } = await params;

        if (!userId || !orgId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        // Get org from our DB (multi-tenant validation)
        const org = await prisma.organization.findUnique({
            where: { clerkOrgId: orgId },
        });

        if (!org) {
            return NextResponse.json(
                { error: "Organización no encontrada" },
                { status: 404 }
            );
        }

        // Get project with details - filtered by orgId (multi-tenant)
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                orgId: org.id, // Multi-tenant isolation
                status: { not: "DELETED" },
            },
            include: {
                stages: {
                    orderBy: { order: "asc" },
                },
                brandCore: true,
                members: {
                    select: {
                        id: true,
                        userId: true,
                        role: true,
                        createdAt: true,
                    },
                },
                _count: {
                    select: {
                        outputs: true,
                        library: true,
                    },
                },
            },
        });

        if (!project) {
            return NextResponse.json(
                { error: "Proyecto no encontrado" },
                { status: 404 }
            );
        }

        return NextResponse.json(project);
    } catch (error) {
        console.error("Error fetching project:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}

// PATCH /api/projects/[id] - Update project
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { userId, orgId } = await auth();
        const { id: projectId } = await params;

        if (!userId || !orgId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const org = await prisma.organization.findUnique({
            where: { clerkOrgId: orgId },
        });

        if (!org) {
            return NextResponse.json(
                { error: "Organización no encontrada" },
                { status: 404 }
            );
        }

        // Verify project belongs to org
        const existingProject = await prisma.project.findFirst({
            where: {
                id: projectId,
                orgId: org.id,
                status: { not: "DELETED" },
            },
        });

        if (!existingProject) {
            return NextResponse.json(
                { error: "Proyecto no encontrado" },
                { status: 404 }
            );
        }

        const body = await request.json();
        const { name, description, status } = body;

        const updatedProject = await prisma.project.update({
            where: { id: projectId },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(status && { status }),
            },
        });

        return NextResponse.json(updatedProject);
    } catch (error) {
        console.error("Error updating project:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}

// DELETE /api/projects/[id] - Soft delete project
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { userId, orgId } = await auth();
        const { id: projectId } = await params;

        if (!userId || !orgId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const org = await prisma.organization.findUnique({
            where: { clerkOrgId: orgId },
        });

        if (!org) {
            return NextResponse.json(
                { error: "Organización no encontrada" },
                { status: 404 }
            );
        }

        // Verify project belongs to org
        const existingProject = await prisma.project.findFirst({
            where: {
                id: projectId,
                orgId: org.id,
                status: { not: "DELETED" },
            },
        });

        if (!existingProject) {
            return NextResponse.json(
                { error: "Proyecto no encontrado" },
                { status: 404 }
            );
        }

        // Soft delete
        await prisma.project.update({
            where: { id: projectId },
            data: { status: "DELETED" },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting project:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
