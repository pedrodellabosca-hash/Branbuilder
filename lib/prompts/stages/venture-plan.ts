/**
 * Venture Plan Prompt
 *
 * Canonical venture_business_plan prompt wrapper.
 */

import type { AIMessage } from "@/lib/ai";
import type { StagePrompt, PromptContext, ParseResult } from "../types";
import { safeParseJSON } from "../types";
import { VenturePlanSchema } from "@/lib/stages/schemas";
import { z } from "zod";

type VenturePlanOutput = z.infer<typeof VenturePlanSchema>;

const SYSTEM_PROMPT = [
    "UNIFIED BUSINESS ARCHITECT",
    "Eres un consultor senior. Sintetiza un plan de negocio claro y accionable.",
    "Responde SIEMPRE en espanol.",
    "Responde SIEMPRE en formato JSON valido segun el schema especificado.",
    "No incluyas markdown, solo JSON puro."
].join("\n");

function formatZodError(error: z.ZodError): string {
    return error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
}

export const venturePlanPrompt: StagePrompt<VenturePlanOutput> = {
    id: "venture-plan-v1",
    version: "1.0.0",
    title: "Venture Business Plan",
    stageKey: "venture_business_plan",

    buildMessages(context: PromptContext): AIMessage[] {
        const previous = context.previousContent
            ? `Contexto previo: ${JSON.stringify(context.previousContent, null, 2)}`
            : "";

        return [
            { role: "system", content: SYSTEM_PROMPT },
            {
                role: "user",
                content: [
                    `Proyecto: ${context.projectName || "Sin nombre"}`,
                    previous,
                    "Entrega el plan en JSON estructurado para su versionado.",
                    "Schema JSON esperado:",
                    JSON.stringify({
                        executive_summary: "string",
                        problem: "string",
                        solution: "string",
                        market: "string",
                        business_model: "string",
                        go_to_market: "string",
                        operations: "string",
                        financials: "string",
                        milestones: ["string"],
                        risks: ["string"]
                    }, null, 2)
                ].filter(Boolean).join("\n\n")
            }
        ];
    },

    parseOutput(raw: string): ParseResult<VenturePlanOutput> {
        const parsed = safeParseJSON<unknown>(raw);
        if (!parsed.ok) return parsed as ParseResult<VenturePlanOutput>;

        const validation = VenturePlanSchema.safeParse(parsed.data);
        if (!validation.success) {
            return { ok: false, raw, error: formatZodError(validation.error) };
        }

        return { ok: true, data: validation.data, raw };
    }
};
