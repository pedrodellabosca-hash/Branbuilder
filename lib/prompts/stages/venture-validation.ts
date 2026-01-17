/**
 * Venture Validation Prompt
 *
 * Canonical venture_idea_validation prompt wrapper.
 */

import type { AIMessage } from "@/lib/ai";
import type { StagePrompt, PromptContext, ParseResult } from "../types";
import { safeParseJSON } from "../types";
import { VentureValidationSchema } from "@/lib/stages/schemas";
import { z } from "zod";

type VentureValidationOutput = z.infer<typeof VentureValidationSchema>;

const SYSTEM_PROMPT = [
    "BUSINESS VIABILITY ARCHITECT V3.2",
    "Eres un analista senior. Evalua la viabilidad del negocio con datos estructurados.",
    "Responde SIEMPRE en espanol.",
    "Responde SIEMPRE en formato JSON valido segun el schema especificado.",
    "No incluyas markdown, solo JSON puro."
].join("\n");

function formatZodError(error: z.ZodError): string {
    return error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
}

export const ventureValidationPrompt: StagePrompt<VentureValidationOutput> = {
    id: "venture-validation-v1",
    version: "1.0.0",
    title: "Venture Idea Validation",
    stageKey: "venture_idea_validation",

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
                    "Evalua la viabilidad del negocio y entrega un JSON estructurado.",
                    "Schema JSON esperado:",
                    JSON.stringify({
                        summary: "string",
                        market_size: {
                            tam: "string",
                            sam: "string",
                            som: "string"
                        },
                        competition: ["string"],
                        risks: ["string"],
                        assumptions: ["string"],
                        recommendation: "string",
                        viability_score: 0
                    }, null, 2)
                ].filter(Boolean).join("\n\n")
            }
        ];
    },

    parseOutput(raw: string): ParseResult<VentureValidationOutput> {
        const parsed = safeParseJSON<unknown>(raw);
        if (!parsed.ok) return parsed as ParseResult<VentureValidationOutput>;

        const validation = VentureValidationSchema.safeParse(parsed.data);
        if (!validation.success) {
            return { ok: false, raw, error: formatZodError(validation.error) };
        }

        return { ok: true, data: validation.data, raw };
    }
};
