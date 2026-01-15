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

    let selectedProjectId: string | null = null;
    let selectedProjectName: string | null = null;

    if (parsed.data.projectId) {
        const project = await prisma.project.findFirst({
            where: { id: parsed.data.projectId, orgId: context.orgId },
            select: { id: true, name: true },
        });
        if (!project) {
            return NextResponse.json(
                { error: "Project not found for this org" },
                { status: 404, headers: { "Cache-Control": "no-store" } }
            );
        }
        selectedProjectId = project.id;
        selectedProjectName = project.name;
    }

    return NextResponse.json(
        {
            userId: context.userId,
            orgId: context.orgId,
            orgSlug: context.orgSlug,
            orgRole: context.orgRole,
            selectedProjectId,
            selectedProjectName,
        },
        { headers: { "Cache-Control": "no-store" } }
    );
}
