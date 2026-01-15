type QualityResult = {
    score: number;
    missingCritical: string[];
    suggestions: string[];
};

const MIN_CHARS = 12;

const REQUIRED_FIELDS: Record<string, { key: string; label: string }[]> = {
    venture_intake: [
        { key: "problem", label: "Problema" },
        { key: "targetMarket", label: "Target Market" },
        { key: "productService", label: "Producto / Servicio" },
    ],
    venture_idea_validation: [
        { key: "hypotheses", label: "Hipótesis" },
        { key: "channels", label: "Canales" },
        { key: "pricingAssumptions", label: "Supuestos de pricing" },
    ],
    venture_buyer_persona: [
        { key: "personaSummary", label: "Resumen de persona" },
        { key: "pains", label: "Pains" },
        { key: "objections", label: "Objeciones" },
    ],
    venture_business_plan: [
        { key: "objective", label: "Objetivo" },
        { key: "revenueModel", label: "Modelo de ingresos" },
        { key: "goToMarket", label: "Go-to-market" },
    ],
};

function isFilled(value: unknown) {
    return typeof value === "string" && value.trim().length >= MIN_CHARS;
}

export function evaluateBriefQuality(stageKey: string, brief: Record<string, string>): QualityResult {
    const required = REQUIRED_FIELDS[stageKey] ?? [];
    const missingCritical: string[] = [];

    for (const field of required) {
        if (!isFilled(brief[field.key])) {
            missingCritical.push(field.label);
        }
    }

    const total = required.length;
    const filled = total - missingCritical.length;
    const score = total === 0 ? 100 : Math.round((filled / total) * 100);

    const suggestions =
        missingCritical.length > 0
            ? [`Completa: ${missingCritical.join(", ")}.`]
            : ["Brief completo para esta etapa."];

    return { score, missingCritical, suggestions };
}
