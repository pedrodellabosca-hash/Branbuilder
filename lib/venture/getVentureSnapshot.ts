import { prisma } from "@/lib/db";

const VENTURE_ORDER = [
    "venture_intake",
    "venture_idea_validation",
    "venture_buyer_persona",
    "venture_business_plan",
] as const;

type VentureStageKey = (typeof VENTURE_ORDER)[number];

type VentureStageSnapshot = {
    approved: boolean;
    hasOutput: boolean;
    latestContent?: unknown;
};

type VentureSnapshot = {
    stages: Record<VentureStageKey, VentureStageSnapshot>;
    snapshot: {
        problem?: string;
        audience?: string;
        persona?: string;
        uvp?: string;
        assumptions?: string;
    };
};

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object") return null;
    return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function joinParts(parts: Array<string | undefined>) {
    const filtered = parts.filter(Boolean) as string[];
    return filtered.length ? filtered.join(" · ") : undefined;
}

export async function getVentureSnapshot(projectId: string): Promise<VentureSnapshot> {
    const stages = await prisma.stage.findMany({
        where: {
            projectId,
            stageKey: { in: VENTURE_ORDER },
        },
        include: {
            outputs: {
                orderBy: { updatedAt: "desc" },
                take: 1,
                include: {
                    versions: {
                        orderBy: { version: "desc" },
                        take: 1,
                        select: { content: true },
                    },
                },
            },
        },
    });

    const stageMap = new Map(stages.map((stage) => [stage.stageKey, stage]));

    const result: VentureSnapshot = {
        stages: {
            venture_intake: { approved: false, hasOutput: false },
            venture_idea_validation: { approved: false, hasOutput: false },
            venture_buyer_persona: { approved: false, hasOutput: false },
            venture_business_plan: { approved: false, hasOutput: false },
        },
        snapshot: {},
    };

    for (const key of VENTURE_ORDER) {
        const stage = stageMap.get(key);
        if (!stage) continue;
        const latestContent = stage.outputs[0]?.versions[0]?.content ?? null;
        result.stages[key] = {
            approved: stage.status === "APPROVED",
            hasOutput: !!latestContent,
            latestContent: latestContent ?? undefined,
        };
    }

    const intake = asRecord(result.stages.venture_intake.latestContent);
    const validation = asRecord(result.stages.venture_idea_validation.latestContent);
    const persona = asRecord(result.stages.venture_buyer_persona.latestContent);
    const plan = asRecord(result.stages.venture_business_plan.latestContent);

    const targetMarket = asRecord(intake?.target_market);
    const productService = asRecord(intake?.product_service);
    const personas = Array.isArray(persona?.personas) ? (persona?.personas as Array<Record<string, unknown>>) : [];
    const primaryPersona = personas[0];

    result.snapshot.problem =
        asString(plan?.problem) ??
        asString(validation?.summary) ??
        asString(intake?.business_idea);

    result.snapshot.audience =
        joinParts([
            asString(targetMarket?.segment),
            asString(targetMarket?.geography),
            asString(targetMarket?.demographics),
            asString(targetMarket?.psychographics),
        ]);

    result.snapshot.persona = joinParts([
        asString(primaryPersona?.name),
        asString(primaryPersona?.role),
    ]);

    result.snapshot.uvp =
        asString(productService?.differentiation) ??
        asString(plan?.solution) ??
        asString(validation?.recommendation);

    if (Array.isArray(validation?.assumptions)) {
        const assumptions = (validation?.assumptions as unknown[])
            .map((item) => asString(item))
            .filter(Boolean) as string[];
        result.snapshot.assumptions = assumptions.length ? assumptions.join(" · ") : undefined;
    }

    return result;
}
