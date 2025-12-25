/**
 * Tagline Stage Prompt
 * 
 * Generates brand tagline/slogan options
 */

import type { AIMessage } from "@/lib/ai";
import type { StagePrompt, PromptContext, ParseResult } from "../types";
import { createSystemMessage, safeParseJSON } from "../types";

export interface TaglineItem {
    tagline: string;
    rationale: string;
    useCase?: string;
}

export interface TaglineOutput {
    items: TaglineItem[];
    notes?: string;
}

export const taglinePrompt: StagePrompt<TaglineOutput> = {
    id: "tagline-v1",
    version: "0.1.0",
    title: "Generación de Tagline",
    stageKey: "tagline",

    buildMessages(context: PromptContext): AIMessage[] {
        const action = context.isRegenerate ? "Regenera" : "Genera";

        return [
            createSystemMessage("especialización en copywriting publicitario y slogans memorables"),
            {
                role: "user",
                content: `${action} 5 opciones de tagline/eslogan para una marca.

Cada tagline debe:
- Tener máximo 8 palabras
- Ser memorable y fácil de pronunciar
- Capturar la esencia de la marca
- Diferenciarse de la competencia

Schema JSON esperado:
{
  "items": [
    { 
      "tagline": "Tu eslogan aquí", 
      "rationale": "Por qué funciona...",
      "useCase": "Ideal para campaña X"
    }
  ],
  "notes": "observaciones opcionales"
}`,
            },
        ];
    },

    parseOutput(raw: string): ParseResult<TaglineOutput> {
        const result = safeParseJSON<TaglineOutput>(raw);

        if (result.ok && result.data) {
            if (!Array.isArray(result.data.items) || result.data.items.length === 0) {
                return { ok: false, raw, error: "Missing items array" };
            }
        }

        return result;
    },
};
