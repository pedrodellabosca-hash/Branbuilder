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

        // Check for specific version request
        const { searchParams } = new URL(request.url);
        const versionParam = searchParams.get("version");
        const specificVersion = versionParam ? parseInt(versionParam) : null;

        // Find output with versions
        const output = await prisma.output.findFirst({
            where: {
                projectId,
                stageId: stage.id,
            },
            include: {
                // Always get recent history for the list
                versions: {
                    orderBy: { version: "desc" },
                    take: 10, // Increased to 10 to see more history
                },
            },
        });

        // Determine which version to show as "current"
        let currentVersion = output?.versions[0] || null;

        // If specific version requested, try to find it in the fetched list or fetch it separately
        if (specificVersion && output) {
            const found = output.versions.find(v => v.version === specificVersion);
            if (found) {
                currentVersion = found;
            } else {
                // Not in recent list, fetch specifically
                const specificV = await prisma.outputVersion.findUnique({
                    where: {
                        outputId_version: {
                            outputId: output.id,
                            version: specificVersion,
                        }
                    }
                });
                if (specificV) {
                    currentVersion = specificV;
                }
            }
        }

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
            versions: output?.versions.map((v) => {
                const params = v.generationParams as any || {};
                return {
                    id: v.id,
                    version: v.version,
                    content: v.content,
                    provider: v.provider,
                    model: v.model,
                    status: v.status,
                    type: v.type,
                    createdAt: v.createdAt,
                    runInfo: {
                        provider: v.provider,
                        model: v.model,
                        preset: params.preset || null,
                        inputTokens: params.tokensIn || 0,
                        outputTokens: params.tokensOut || 0,
                        totalTokens: params.totalTokens || 0,
                    }
                };
            }) || [],
            latestVersion: output?.versions[0] || null, // Always the absolute latest
            currentVersion: currentVersion ? { // The one to display
                id: currentVersion.id,
                version: currentVersion.version,
                content: currentVersion.content,
                provider: currentVersion.provider,
                model: currentVersion.model,
                status: currentVersion.status,
                type: currentVersion.type,
                createdAt: currentVersion.createdAt,
                runInfo: {
                    provider: currentVersion.provider,
                    model: currentVersion.model,
                    preset: (currentVersion.generationParams as any)?.preset || null,
                    inputTokens: (currentVersion.generationParams as any)?.tokensIn || 0,
                    outputTokens: (currentVersion.generationParams as any)?.tokensOut || 0,
                    totalTokens: (currentVersion.generationParams as any)?.totalTokens || 0,
                }
            } : null,
        });
    } catch (error) {
        console.error("[Stage Output] Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
