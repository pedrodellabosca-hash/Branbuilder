/**
 * Venture Intake Prompt
 *
 * Canonical venture_intake prompt wrapper.
 */

import type { AIMessage } from "@/lib/ai";
import type { StagePrompt, PromptContext, ParseResult } from "../types";
import { safeParseJSON } from "../types";
import { VentureIntakeSchema } from "@/lib/stages/schemas";
import type { z } from "zod";

type VentureIntakeOutput = z.infer<typeof VentureIntakeSchema>;

const SYSTEM_PROMPT = [
    "AGENTE DE INTAKE PLANLY",
    "Eres un consultor experto en venture building. Extrae y estructura la idea de negocio.",
    "Responde SIEMPRE en espanol.",
    "Responde SIEMPRE en formato JSON valido segun el schema especificado.",
    "No incluyas markdown, solo JSON puro."
].join("\n");

function formatZodError(error: z.ZodError): string {
    return error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
}

export const ventureIntakePrompt: StagePrompt<VentureIntakeOutput> = {
    id: "venture-intake-v1",
    version: "1.0.0",
    title: "Venture Intake",
    stageKey: "venture_intake",

    buildMessages(context: PromptContext): AIMessage[] {
        const seed = context.seedText ? `Idea base: ${context.seedText}` : "";
        const prior = context.previousContent
            ? `Contexto previo: ${JSON.stringify(context.previousContent, null, 2)}`
            : "";

        return [
            { role: "system", content: SYSTEM_PROMPT },
            {
                role: "user",
                content: [
                    `Proyecto: ${context.projectName || "Sin nombre"}`,
                    seed,
                    prior,
                    "Devuelve un JSON con campos como business_idea, target_market y product_service.",
                    "Schema JSON esperado:",
                    JSON.stringify({
                        business_idea: "string",
                        target_market: {
                            segment: "string",
                            geography: "string",
                            demographics: "string",
                            psychographics: "string",
                            pain_points: ["string"],
                            needs: ["string"]
                        },
                        product_service: {
                            name: "string",
                            description: "string",
                            differentiation: "string"
                        },
                        pricing_model: {
                            type: "string",
                            price_range: "string"
                        },
                        competitive_advantage: "string",
                        channels: ["string"],
                        traction: {
                            users: "string",
                            revenue: "string",
                            proof: "string"
                        },
                        founders: [
                            { name: "string", role: "string", background: "string" }
                        ],
                        constraints: ["string"],
                        goals: ["string"]
                    }, null, 2)
                ].filter(Boolean).join("\n\n"),
            }
        ];
    },

    parseOutput(raw: string): ParseResult<VentureIntakeOutput> {
        const parsed = safeParseJSON<unknown>(raw);
        if (!parsed.ok) return parsed as ParseResult<VentureIntakeOutput>;

        const validation = VentureIntakeSchema.safeParse(parsed.data);
        if (!validation.success) {
            return { ok: false, raw, error: formatZodError(validation.error) };
        }

        return { ok: true, data: validation.data, raw };
    }
};
