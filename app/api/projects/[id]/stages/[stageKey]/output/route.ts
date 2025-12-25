/**
 * GET /api/projects/[id]/stages/[stageKey]/output
 * 
 * Get output and recent versions for a stage.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function GET(
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

        // Find org
        const org = await prisma.organization.findUnique({
            where: { clerkOrgId: orgId },
        });

        if (!org) {
            return NextResponse.json(
                { error: "Organization not found" },
                { status: 404 }
            );
        }

        // Verify project belongs to org
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                orgId: org.id,
            },
        });

        if (!project) {
            return NextResponse.json(
                { error: "Project not found" },
                { status: 404 }
            );
        }

        // Find stage
        const stage = await prisma.stage.findFirst({
            where: {
                projectId,
                stageKey,
            },
        });

        if (!stage) {
            return NextResponse.json({
                output: null,
                versions: [],
                stage: null,
            });
        }

        // Find output with versions
        const output = await prisma.output.findFirst({
            where: {
                projectId,
                stageId: stage.id,
            },
            include: {
                versions: {
                    orderBy: { version: "desc" },
                    take: 5,
                },
            },
        });

        return NextResponse.json({
            stage: {
                id: stage.id,
                stageKey: stage.stageKey,
                name: stage.name,
                status: stage.status,
            },
            output: output
                ? {
                    id: output.id,
                    name: output.name,
                    outputKey: output.outputKey,
                }
                : null,
            versions: output?.versions.map((v) => ({
                id: v.id,
                version: v.version,
                content: v.content,
                provider: v.provider,
                model: v.model,
                status: v.status,
                type: v.type,
                createdAt: v.createdAt,
            })) || [],
            latestVersion: output?.versions[0] || null,
        });
    } catch (error) {
        console.error("[Stage Output] Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
