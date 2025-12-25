/**
 * Default Stage Prompt
 * 
 * Fallback prompt for stages without specific prompts
 */

import type { AIMessage } from "@/lib/ai";
import type { StagePrompt, PromptContext, ParseResult } from "../types";
import { createSystemMessage, safeParseJSON } from "../types";

export interface DefaultOutput {
    title: string;
    content: string;
    sections?: { heading: string; body: string }[];
    notes?: string;
}

export const defaultPrompt: StagePrompt<DefaultOutput> = {
    id: "default-v1",
    version: "0.1.0",
    title: "Generación de Contenido",
    stageKey: "default",

    buildMessages(context: PromptContext): AIMessage[] {
        const action = context.isRegenerate ? "Regenera" : "Genera";

        return [
            createSystemMessage("amplia experiencia en branding y comunicación estratégica"),
            {
                role: "user",
                content: `${action} contenido profesional para la etapa "${context.stageName}" de un proyecto de branding.

El contenido debe ser:
- Profesional y accionable
- Estructurado y fácil de implementar
- Alineado con mejores prácticas de branding

Schema JSON esperado:
{
  "title": "${context.stageName}",
  "content": "Contenido principal...",
  "sections": [
    { "heading": "Sección 1", "body": "..." },
    { "heading": "Sección 2", "body": "..." }
  ],
  "notes": "observaciones opcionales"
}`,
            },
        ];
    },

    parseOutput(raw: string): ParseResult<DefaultOutput> {
        const result = safeParseJSON<DefaultOutput>(raw);

        if (result.ok && result.data) {
            if (!result.data.content || result.data.content.length < 20) {
                return { ok: false, raw, error: "Content too short or missing" };
            }
        }

        return result;
    },
};
