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
    { params }: { params: Promise<{ id: string; stageKey: string }> }
) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: projectId, stageKey } = await params;

    try {
        const json = await request.json();
        const config = configSchema.parse(json);

        // Verify ownership & Get Stage ID
        const stage = await prisma.stage.findFirst({
            where: {
                stageKey: stageKey,
                projectId: projectId,
                project: { org: { clerkOrgId: orgId } }
            },
        });

        if (!stage) return new NextResponse("Stage not found", { status: 404 });

        const updatedStage = await prisma.stage.update({
            where: { id: stage.id },
            data: {
                config: config,
            } as any,
        });

        return NextResponse.json((updatedStage as any).config);
    } catch (error) {
        console.error("[Config] Update failed:", error);
        return new NextResponse("Invalid request", { status: 400 });
    }
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string; stageKey: string }> }
) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: projectId, stageKey } = await params;

    const stage = await prisma.stage.findFirst({
        where: {
            stageKey: stageKey,
            projectId: projectId,
            project: { org: { clerkOrgId: orgId } }
        },
        select: { config: true } as any
    });

    if (!stage) return new NextResponse("Not found", { status: 404 });

    return NextResponse.json((stage as any).config || {});
}
