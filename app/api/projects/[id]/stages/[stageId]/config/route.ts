import { NextResponse } from "next/server";
// Re-trigger IDE types
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const configSchema = z.object({
    provider: z.string(),
    model: z.string(),
    preset: z.enum(["fast", "balanced", "quality"]),
});

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string; stageId: string }> }
) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: projectId, stageId } = await params;

    try {
        const json = await request.json();
        const config = configSchema.parse(json);

        // Verify ownership
        const project = await prisma.project.findFirst({
            where: { id: projectId, org: { clerkOrgId: orgId } }
        });

        if (!project) return new NextResponse("Project not found", { status: 404 });

        const stage = await prisma.stage.update({
            where: {
                id: stageId,
                projectId: projectId,
            },
            data: {
                config: config,
            } as any,
        });

        return NextResponse.json((stage as any).config);
    } catch (error) {
        console.error("[Config] Update failed:", error);
        return new NextResponse("Invalid request", { status: 400 });
    }
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string; stageId: string }> }
) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: projectId, stageId } = await params;

    const stage = await prisma.stage.findFirst({
        where: {
            id: stageId,
            projectId: projectId,
            project: { org: { clerkOrgId: orgId } }
        },
        select: { config: true } as any
    });

    if (!stage) return new NextResponse("Not found", { status: 404 });

    return NextResponse.json((stage as any).config || {});
}
