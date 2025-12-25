/**
 * POST /api/projects/[id]/stages/[stageKey]/run
 * 
 * Execute a stage generation job.
 * - Validates auth + orgId
 * - Verifies project belongs to org
 * - Creates or finds Output
 * - Creates job (QUEUED) or returns existing QUEUED/PROCESSING job (idempotent)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

// Stage definitions (matches what exists in DB)
const STAGE_DEFINITIONS: Record<string, { name: string; module: "A" | "B"; order: number }> = {
    naming: { name: "Naming", module: "A", order: 1 },
    manifesto: { name: "Manifiesto de Marca", module: "A", order: 2 },
    voice: { name: "Voz de Marca", module: "A", order: 3 },
    tagline: { name: "Tagline", module: "A", order: 4 },
    palette: { name: "Paleta de Colores", module: "B", order: 5 },
    typography: { name: "Tipografía", module: "B", order: 6 },
};

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

        // Find or create stage
        let stage = await prisma.stage.findFirst({
            where: {
                projectId,
                stageKey,
            },
        });

        if (!stage) {
            // Create stage if it doesn't exist
            const stageDef = STAGE_DEFINITIONS[stageKey];
            if (!stageDef) {
                return NextResponse.json(
                    { error: `Unknown stageKey: ${stageKey}` },
                    { status: 400 }
                );
            }

            stage = await prisma.stage.create({
                data: {
                    projectId,
                    stageKey,
                    name: stageDef.name,
                    module: stageDef.module,
                    order: stageDef.order,
                    status: "NOT_STARTED",
                },
            });
        }

        // Check for existing QUEUED or PROCESSING job (idempotency)
        const existingJob = await prisma.job.findFirst({
            where: {
                orgId: org.id,
                projectId,
                stage: stageKey,
                type: { in: ["GENERATE_OUTPUT", "REGENERATE_OUTPUT"] },
                status: { in: ["QUEUED", "PROCESSING"] },
            },
            orderBy: { createdAt: "desc" },
        });

        if (existingJob) {
            return NextResponse.json({
                jobId: existingJob.id,
                status: existingJob.status,
                message: "Job already in progress",
                idempotent: true,
            });
        }

        // Find or create output
        let output = await prisma.output.findFirst({
            where: {
                projectId,
                stageId: stage.id,
            },
        });

        const isRegenerate = output !== null;

        if (!output) {
            output = await prisma.output.create({
                data: {
                    projectId,
                    stageId: stage.id,
                    name: `Output de ${stage.name}`,
                    outputKey: `${stageKey}_output`,
                },
            });
        }

        // Create job
        const jobType = isRegenerate ? "REGENERATE_OUTPUT" : "GENERATE_OUTPUT";
        const job = await prisma.job.create({
            data: {
                orgId: org.id,
                projectId,
                module: stage.module,
                stage: stageKey,
                type: jobType,
                payload: {
                    stageId: stage.id,
                    outputId: output.id,
                    stageKey,
                    projectName: project.name,
                },
            },
        });

        return NextResponse.json({
            jobId: job.id,
            status: job.status,
            stageId: stage.id,
            outputId: output.id,
            isRegenerate,
        });
    } catch (error) {
        console.error("[Stage Run] Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
