import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/admin/adminGuard";
import { redactSecrets } from "@/lib/security/redactSecrets";

const querySchema = z.object({
    projectId: z.string().optional(),
});

function getEnvProviderFlags() {
    return {
        openai: !!process.env.OPENAI_API_KEY,
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        mock: true,
    };
}

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
        organizationAIConfig?: {
            findUnique: (args: unknown) => Promise<{ stageConfigs: unknown } | null>;
        };
        projectAIConfig?: {
            findUnique: (args: unknown) => Promise<{ stageConfigs: unknown } | null>;
        };
    };
    const envFlags = getEnvProviderFlags();

    const apiKeys = await prisma.apiKey.findMany({
        where: { orgId: context.orgId },
        select: { provider: true },
    });
    const providerSet = new Set(apiKeys.map((k) => k.provider));
    const providerFlags = {
        openai: providerSet.has("openai") || envFlags.openai,
        anthropic: providerSet.has("anthropic") || envFlags.anthropic,
        mock: envFlags.mock,
    };

    let orgStageConfigs: unknown = null;
    let orgConfigAvailable = false;
    if (prismaAny.organizationAIConfig?.findUnique) {
        const config = await prismaAny.organizationAIConfig.findUnique({
            where: { orgId: context.orgId },
            select: { stageConfigs: true },
        });
        orgStageConfigs = config?.stageConfigs ?? null;
        orgConfigAvailable = true;
    }

    let projectStageConfigs: unknown = null;
    let projectConfigAvailable = false;
    if (prismaAny.projectAIConfig?.findUnique) {
        const config = await prismaAny.projectAIConfig.findUnique({
            where: { projectId: parsed.data.projectId },
            select: { stageConfigs: true },
        });
        projectStageConfigs = config?.stageConfigs ?? null;
        projectConfigAvailable = true;
    }

    const payload = redactSecrets({
        org: {
            stageConfigs: orgStageConfigs,
            providerFlags,
            available: orgConfigAvailable,
        },
        project: {
            stageConfigs: projectStageConfigs,
            providerFlags,
            available: projectConfigAvailable,
        },
    });

    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
