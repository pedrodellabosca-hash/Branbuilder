/**
 * Venture Persona Prompt
 *
 * Canonical venture_buyer_persona prompt wrapper.
 */

import type { AIMessage } from "@/lib/ai";
import type { StagePrompt, PromptContext, ParseResult } from "../types";
import { safeParseJSON } from "../types";
import { VenturePersonaSchema } from "@/lib/stages/schemas";
import { z } from "zod";

type VenturePersonaOutput = z.infer<typeof VenturePersonaSchema>;

const SYSTEM_PROMPT = [
    "HUNTER V3",
    "Eres un estratega de marketing. Construye buyer personas claras y accionables.",
    "Responde SIEMPRE en espanol.",
    "Responde SIEMPRE en formato JSON valido segun el schema especificado.",
    "No incluyas markdown, solo JSON puro."
].join("\n");

function formatZodError(error: z.ZodError): string {
    return error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
}

export const venturePersonaPrompt: StagePrompt<VenturePersonaOutput> = {
    id: "venture-persona-v1",
    version: "1.0.0",
    title: "Venture Buyer Persona",
    stageKey: "venture_buyer_persona",

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
                    "Entrega buyer personas en un JSON con lista de perfiles.",
                    "Schema JSON esperado:",
                    JSON.stringify({
                        personas: [
                            {
                                name: "string",
                                role: "string",
                                goals: ["string"],
                                pains: ["string"],
                                behaviors: ["string"],
                                motivations: ["string"]
                            }
                        ],
                        notes: "string"
                    }, null, 2)
                ].filter(Boolean).join("\n\n")
            }
        ];
    },

    parseOutput(raw: string): ParseResult<VenturePersonaOutput> {
        const parsed = safeParseJSON<unknown>(raw);
        if (!parsed.ok) return parsed as ParseResult<VenturePersonaOutput>;

        const validation = VenturePersonaSchema.safeParse(parsed.data);
        if (!validation.success) {
            return { ok: false, raw, error: formatZodError(validation.error) };
        }

        return { ok: true, data: validation.data, raw };
    }
};
