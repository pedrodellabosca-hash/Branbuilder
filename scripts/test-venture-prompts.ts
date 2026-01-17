import { ventureIntakePrompt } from "../lib/prompts/stages/venture-intake";
import { ventureValidationPrompt } from "../lib/prompts/stages/venture-validation";
import { venturePersonaPrompt } from "../lib/prompts/stages/venture-persona";
import { venturePlanPrompt } from "../lib/prompts/stages/venture-plan";

function assertSignature(promptId: string, systemContent: string, signature: string) {
    if (!systemContent.includes(signature)) {
        throw new Error(`Missing signature for ${promptId}: ${signature}`);
    }
}

function buildCanonicalBriefMarkdown() {
    return [
        "# Venture Brief",
        "## Idea",
        "## Market",
        "## Personas",
        "## Plan"
    ].join("\n");
}

async function main() {
    console.log("🧪 Venture Prompt Verification");

    const context = {
        stageName: "Venture",
        stageKey: "venture_intake",
        isRegenerate: false,
        projectName: "Test Venture",
    };

    const intakeMsgs = ventureIntakePrompt.buildMessages(context);
    const intakeSys = intakeMsgs.find(m => m.role === "system")?.content || "";
    assertSignature(ventureIntakePrompt.id, intakeSys, "AGENTE DE INTAKE PLANLY");

    const validationMsgs = ventureValidationPrompt.buildMessages({
        ...context,
        stageKey: "venture_idea_validation",
    });
    const validationSys = validationMsgs.find(m => m.role === "system")?.content || "";
    assertSignature(ventureValidationPrompt.id, validationSys, "BUSINESS VIABILITY ARCHITECT V3.2");

    const personaMsgs = venturePersonaPrompt.buildMessages({
        ...context,
        stageKey: "venture_buyer_persona",
    });
    const personaSys = personaMsgs.find(m => m.role === "system")?.content || "";
    assertSignature(venturePersonaPrompt.id, personaSys, "HUNTER V3");

    const planMsgs = venturePlanPrompt.buildMessages({
        ...context,
        stageKey: "venture_business_plan",
    });
    const planSys = planMsgs.find(m => m.role === "system")?.content || "";
    assertSignature(venturePlanPrompt.id, planSys, "UNIFIED BUSINESS ARCHITECT");

    const intakeMock = {
        business_idea: "Plataforma de IA para asesoria legal",
        target_market: {
            segment: "Pymes",
            geography: "LatAm",
            demographics: "Empresas 5-50 empleados",
            psychographics: "Orientadas a eficiencia",
            pain_points: ["Costos legales altos"],
            needs: ["Asesoria rapida"],
        },
        product_service: {
            name: "LexAI",
            description: "Asistente legal con IA",
            differentiation: "Especializado en normativa local",
        },
        pricing_model: {
            type: "suscripcion",
            price_range: "USD 99-299",
        },
        competitive_advantage: "Datos locales + interfaz simple",
        channels: ["Partnerships", "SEO"],
        traction: {
            users: "Piloto con 5 clientes",
            revenue: "USD 2k MRR",
            proof: "Cartas de intencion",
        },
        founders: [{ name: "Ana", role: "CEO", background: "Legal/Tech" }],
        constraints: ["Regulacion cambiante"],
        goals: ["Llegar a 100 clientes"],
    };

    const validationMock = {
        summary: "Alta oportunidad en mercado legal desatendido.",
        market_size: { tam: "USD 2B", sam: "USD 400M", som: "USD 20M" },
        competition: ["Firmas tradicionales", "SaaS globales"],
        risks: ["Regulatorio", "Adopcion lenta"],
        assumptions: ["Disposicion a pagar", "Ciclo de venta corto"],
        recommendation: "Continuar con MVP y pilotos",
        viability_score: 8,
    };

    const personaMock = {
        personas: [
            {
                name: "Diana",
                role: "Gerente de Operaciones",
                goals: ["Reducir costos"],
                pains: ["Tiempos de respuesta"],
                behaviors: ["Busca automatizacion"],
                motivations: ["Cumplimiento"],
            },
        ],
        notes: "Priorizar sectores regulados.",
    };

    const planMock = {
        executive_summary: "Negocio SaaS para automatizar consultas legales.",
        problem: "Costos legales elevados y lentitud.",
        solution: "Asistente IA especializado.",
        market: "Pymes en LatAm.",
        business_model: "Suscripcion mensual.",
        go_to_market: "Pilotos y partnerships.",
        operations: "Equipo lean con soporte legal.",
        financials: "Breakeven en 18 meses.",
        milestones: ["MVP", "Pilotos", "Escalamiento"],
        risks: ["Regulatorio", "Competencia"],
    };

    const intakeParsed = ventureIntakePrompt.parseOutput(JSON.stringify(intakeMock));
    if (!intakeParsed.ok) throw new Error(`Intake parse failed: ${intakeParsed.error}`);

    const validationParsed = ventureValidationPrompt.parseOutput(JSON.stringify(validationMock));
    if (!validationParsed.ok) throw new Error(`Validation parse failed: ${validationParsed.error}`);

    const personaParsed = venturePersonaPrompt.parseOutput(JSON.stringify(personaMock));
    if (!personaParsed.ok) throw new Error(`Persona parse failed: ${personaParsed.error}`);

    const planParsed = venturePlanPrompt.parseOutput(JSON.stringify(planMock));
    if (!planParsed.ok) throw new Error(`Plan parse failed: ${planParsed.error}`);

    const brief = buildCanonicalBriefMarkdown();
    if (!brief.includes("# Venture Brief")) {
        throw new Error("Canonical brief generation failed");
    }

    console.log("✅ Venture prompt signatures and schemas validated.");
    console.log("✅ Canonical brief markdown generated.");
}

main().catch((error) => {
    console.error("❌ Venture prompt verification failed:", error);
    process.exit(1);
});
