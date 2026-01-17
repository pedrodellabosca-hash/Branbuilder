import { NextResponse } from "next/server";
// Re-trigger IDE types
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { getVentureBriefSchema } from "@/lib/venture/briefSchemas";

const configSchema = z.object({
    provider: z.string().optional(),
    model: z.string().optional(),
    preset: z.enum(["fast", "balanced", "quality"]).optional(),
    brief: z.unknown().optional(),
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
            select: { id: true, stageKey: true, config: true } as any,
        });

        if (!stage) return new NextResponse("Stage not found", { status: 404 });

        let validatedBrief: unknown | undefined;
        if (config.brief !== undefined) {
            const stageKeyValue = String(stage.stageKey);
            const schema = getVentureBriefSchema(stageKeyValue);
            if (schema) {
                validatedBrief = schema.parse(config.brief);
            } else {
                validatedBrief = config.brief;
            }
        }

        const existingConfig = (stage as any).config || {};
        const nextConfig = {
            ...existingConfig,
            ...(config.provider ? { provider: config.provider } : {}),
            ...(config.model ? { model: config.model } : {}),
            ...(config.preset ? { preset: config.preset } : {}),
            ...(config.brief !== undefined ? { brief: validatedBrief } : {}),
        };

        const updatedStage = await prisma.stage.update({
            where: { id: String(stage.id) },
            data: {
                config: nextConfig,
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
