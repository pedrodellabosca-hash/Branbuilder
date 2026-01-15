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

    if (!parsed.data.projectId) {
        return NextResponse.json(
            { error: "projectId required" },
            { status: 400, headers: { "Cache-Control": "no-store" } }
        );
    }

    const project = await prisma.project.findFirst({
        where: { id: parsed.data.projectId, orgId: context.orgId },
        select: { id: true },
    });

    if (!project) {
        return NextResponse.json(
            { error: "Project not found for this org" },
            { status: 404, headers: { "Cache-Control": "no-store" } }
        );
    }

    const prismaAny = prisma as unknown as {
        stageModelRecommendation?: {
            findMany: (args: unknown) => Promise<
                Array<{
                    id: string;
                    stageKey: string;
                    recommendedModelKey: string;
                    fallbackModelKey: string | null;
                }>
            >;
        };
    };

    if (!prismaAny.stageModelRecommendation?.findMany) {
        return NextResponse.json(
            { org: [], project: [], merged: [], notAvailable: true },
            { headers: { "Cache-Control": "no-store" } }
        );
    }

    const org = await prismaAny.stageModelRecommendation.findMany({
        where: { orgId: context.orgId },
        orderBy: { stageKey: "asc" },
        select: {
            id: true,
            stageKey: true,
            recommendedModelKey: true,
            fallbackModelKey: true,
        },
    });

    const merged = org.map((rec) => ({
        ...rec,
        scope: "org",
    }));

    return NextResponse.json(
        {
            org,
            project: [],
            merged,
            notAvailable: false,
        },
        { headers: { "Cache-Control": "no-store" } }
    );
}
