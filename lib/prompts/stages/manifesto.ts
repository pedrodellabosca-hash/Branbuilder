/**
 * Manifesto Stage Prompt
 * 
 * Generates brand manifesto with core principles
 */

import type { AIMessage } from "@/lib/ai";
import type { StagePrompt, PromptContext, ParseResult } from "../types";
import { createSystemMessage, safeParseJSON } from "../types";

export interface ManifestoOutput {
    manifesto: string;
    principles: string[];
    values?: string[];
    notes?: string;
}

export const manifestoPrompt: StagePrompt<ManifestoOutput> = {
    id: "manifesto-v1",
    version: "0.1.0",
    title: "Generación de Manifiesto",
    stageKey: "manifesto",

    buildMessages(context: PromptContext): AIMessage[] {
        const action = context.isRegenerate ? "Regenera" : "Genera";

        return [
            createSystemMessage("especialización en estrategia de marca y storytelling corporativo"),
            {
                role: "user",
                content: `${action} un manifiesto de marca poderoso y memorable.

El manifiesto debe:
- Tener 100-150 palabras
- Capturar la esencia y propósito de la marca
- Inspirar tanto a empleados como a clientes
- Usar lenguaje emotivo pero profesional

Incluye también:
- 3-5 principios fundamentales
- 3-5 valores de marca

Schema JSON esperado:
{
  "manifesto": "texto del manifiesto...",
  "principles": ["Principio 1", "Principio 2", ...],
  "values": ["Valor 1", "Valor 2", ...],
  "notes": "observaciones opcionales"
}`,
            },
        ];
    },

    parseOutput(raw: string): ParseResult<ManifestoOutput> {
        const result = safeParseJSON<ManifestoOutput>(raw);

        if (result.ok && result.data) {
            if (!result.data.manifesto || result.data.manifesto.length < 50) {
                return { ok: false, raw, error: "Manifesto too short or missing" };
            }
            if (!Array.isArray(result.data.principles) || result.data.principles.length < 2) {
                return { ok: false, raw, error: "Need at least 2 principles" };
            }
        }

        return result;
    },
};
