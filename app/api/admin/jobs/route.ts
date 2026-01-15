import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/admin/adminGuard";

const querySchema = z.object({
    projectId: z.string().optional(),
});

export async function GET(request: NextRequest) {
    const authResult = await requireAdminApi();
    if (!authResult.ok) return authResult.response;

    const { context } = authResult;
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
        projectId: searchParams.get("projectId") ?? undefined,
    });

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Invalid query" },
            { status: 400, headers: { "Cache-Control": "no-store" } }
        );
    }

    const jobs = await prisma.job.findMany({
        where: {
            orgId: context.orgId,
            ...(parsed.data.projectId ? { projectId: parsed.data.projectId } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
            id: true,
            status: true,
            stage: true,
            projectId: true,
            createdAt: true,
            project: {
                select: {
                    name: true,
                },
            },
        },
    });

    const payload = jobs.map((job) => ({
        id: job.id,
        status: job.status,
        stageKey: job.stage,
        projectId: job.projectId,
        projectName: job.project?.name ?? null,
        createdAt: job.createdAt,
    }));

    return NextResponse.json(
        { jobs: payload },
        { headers: { "Cache-Control": "no-store" } }
    );
}
