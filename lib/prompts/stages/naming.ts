/**
 * Naming Stage Prompt
 * 
 * Generates brand name options with rationale
 */

import type { AIMessage } from "@/lib/ai";
import type { StagePrompt, PromptContext, ParseResult } from "../types";
import { createSystemMessage, safeParseJSON } from "../types";

export interface NamingItem {
    name: string;
    rationale: string;
    domainHints?: string[];
}

export interface NamingOutput {
    items: NamingItem[];
    notes?: string;
}

export const namingPrompt: StagePrompt<NamingOutput> = {
    id: "naming-v1",
    version: "0.1.0",
    title: "Generación de Naming",
    stageKey: "naming",

    buildMessages(context: PromptContext): AIMessage[] {
        const action = context.isRegenerate ? "Regenera" : "Genera";

        return [
            createSystemMessage("más de 10 años de experiencia en naming y creación de marcas"),
            {
                role: "user",
                content: `${action} 5 opciones de naming para una marca.

Para cada opción incluye:
- name: el nombre propuesto (máximo 2 palabras)
- rationale: justificación breve (1-2 oraciones)
- domainHints: 2-3 sugerencias de dominio disponibles

Schema JSON esperado:
{
  "items": [
    { "name": "...", "rationale": "...", "domainHints": ["...", "..."] }
  ],
  "notes": "observaciones opcionales"
}`,
            },
        ];
    },

    parseOutput(raw: string): ParseResult<NamingOutput> {
        const result = safeParseJSON<NamingOutput>(raw);

        if (result.ok && result.data) {
            // Validate structure
            if (!Array.isArray(result.data.items)) {
                return { ok: false, raw, error: "Missing items array" };
            }
            if (result.data.items.length === 0) {
                return { ok: false, raw, error: "Empty items array" };
            }
        }

        return result;
    },
};
