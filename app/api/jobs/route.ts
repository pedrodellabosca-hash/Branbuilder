import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { processJobSync } from "@/lib/jobs/processor";

const JOB_TYPES = [
    "GENERATE_OUTPUT",
    "REGENERATE_OUTPUT",
    "PROCESS_LIBRARY_FILE",
    "BUILD_BRAND_PACK",
    "BUILD_STRATEGY_PACK",
    "BUILD_BRAND_MANUAL",
    "BATCH_LOGOS",
    "BATCH_MOCKUPS",
] as const;

// Types that REQUIRE projectId
const PROJECT_REQUIRED_TYPES = [
    "GENERATE_OUTPUT",
    "REGENERATE_OUTPUT",
    "BUILD_BRAND_PACK",
    "BUILD_STRATEGY_PACK",
    "BUILD_BRAND_MANUAL",
    "BATCH_LOGOS",
    "BATCH_MOCKUPS",
] as const;

const enqueueJobSchema = z.object({
    type: z.enum(JOB_TYPES),
    projectId: z.string().optional(),
    module: z.enum(["A", "B"]).optional(),
    stage: z.string().optional(),
    payload: z.record(z.string(), z.unknown()),
});

// DEV mode: process jobs synchronously
const SYNC_PROCESS_DEV = process.env.NODE_ENV === "development";

// POST /api/jobs - Enqueue a new job
export async function POST(request: NextRequest) {
    try {
        const { userId, orgId } = await auth();

        if (!userId || !orgId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        // Get org from our DB
        const org = await prisma.organization.findUnique({
            where: { clerkOrgId: orgId },
        });

        if (!org) {
            return NextResponse.json(
                { error: "Organización no encontrada" },
                { status: 404 }
            );
        }

        // Parse body
        const body = await request.json();
        const validation = enqueueJobSchema.safeParse(body);

        if (!validation.success) {
            const issues = validation.error.issues;
            return NextResponse.json(
                { error: issues[0]?.message || "Datos inválidos" },
                { status: 400 }
            );
        }

        const { type, projectId, module, stage, payload } = validation.data;

        // Validate: projectId REQUIRED for certain job types
        const requiresProject = PROJECT_REQUIRED_TYPES.includes(
            type as (typeof PROJECT_REQUIRED_TYPES)[number]
        );

        if (requiresProject && !projectId) {
            return NextResponse.json(
                { error: `projectId es requerido para jobs de tipo ${type}` },
                { status: 400 }
            );
        }

        // If projectId provided, verify access
        if (projectId) {
            const project = await prisma.project.findFirst({
                where: {
                    id: projectId,
                    orgId: org.id,
                },
            });

            if (!project) {
                return NextResponse.json(
                    { error: "Proyecto no encontrado" },
                    { status: 404 }
                );
            }
        }

        // Create job
        const job = await prisma.job.create({
            data: {
                orgId: org.id,
                projectId,
                module: module as "A" | "B" | undefined,
                stage,
                type,
                payload: payload as object,
            },
        });

        console.log(
            `[Jobs API] Created job ${job.id} with projectId=${job.projectId}`
        );

        // DEV MODE: Process job inline so UI gets immediate DONE/FAILED
        if (SYNC_PROCESS_DEV) {
            console.log(
                `[Jobs API] DEV mode: processing job ${job.id} inline (await)`
            );
            await processJobSync(job.id);
        }

        // Refresh job status after processing (important!)
        const freshJob = await prisma.job.findUnique({
            where: { id: job.id },
            select: { id: true, status: true },
        });

        return NextResponse.json(
            { jobId: job.id, status: freshJob?.status ?? job.status },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error creating job:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}