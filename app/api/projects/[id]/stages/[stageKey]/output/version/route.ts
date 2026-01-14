import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { outputService } from "@/lib/outputs/OutputService";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; stageKey: string }> }
) {
    try {
        const { userId, orgId } = await auth();

        if (!userId || !orgId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id: projectId, stageKey } = await params;
        const body = await request.json();
        const { content, baseVersionId } = body;

        // Guard removed: Generalized for all stages


        if (!content) {
            return NextResponse.json(
                { error: "Missing content" },
                { status: 400 }
            );
        }

        // Verify project/org access
        const project = await prisma.project.findFirst({
            where: { id: projectId, orgId: (await prisma.organization.findUnique({ where: { clerkOrgId: orgId } }))?.id },
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Find stage to get ID
        const stage = await prisma.stage.findFirst({
            where: { projectId, stageKey },
        });

        if (!stage) {
            return NextResponse.json({ error: "Stage not found" }, { status: 404 });
        }

        // Ensure output parent exists
        const output = await outputService.ensureOutput(projectId, stage.id, stage.name, stageKey);

        // Create MANUAL version
        // We reuse outputService but pass 0 for AI metrics
        await prisma.outputVersion.create({
            data: {
                outputId: output.id,
                version: (await prisma.outputVersion.count({ where: { outputId: output.id } })) + 1,
                content: typeof content === 'string' ? { raw: content } : content,
                provider: "MANUAL",
                model: "human",
                promptSetVersion: "manual",
                generationParams: {
                    latencyMs: 0,
                    tokensIn: 0,
                    tokensOut: 0,
                    totalTokens: 0,
                    preset: "manual",
                    validated: true,
                    multiplier: 0,
                    billedTokens: 0,
                    editedFromVersion: baseVersionId || null,
                    edited: true,
                },
                createdBy: userId,
                type: "EDITED",
                status: "GENERATED",
            },
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("[Manual Version] Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
