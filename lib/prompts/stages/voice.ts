/**
 * Voice Stage Prompt
 * 
 * Generates brand voice and tone guidelines
 */

import type { AIMessage } from "@/lib/ai";
import type { StagePrompt, PromptContext, ParseResult } from "../types";
import { createSystemMessage, safeParseJSON } from "../types";

export interface VoiceOutput {
    tone: string;
    personality: string[];
    dos: string[];
    donts: string[];
    examples: {
        context: string;
        good: string;
        bad: string;
    }[];
    notes?: string;
}

export const voicePrompt: StagePrompt<VoiceOutput> = {
    id: "voice-v1",
    version: "0.1.0",
    title: "Generación de Voz de Marca",
    stageKey: "voice",

    buildMessages(context: PromptContext): AIMessage[] {
        const action = context.isRegenerate ? "Regenera" : "Genera";

        return [
            createSystemMessage("especialización en comunicación de marca y copywriting"),
            {
                role: "user",
                content: `${action} una guía completa de voz de marca.

La guía debe incluir:
- tone: descripción del tono general (1-2 oraciones)
- personality: 3-5 atributos de personalidad
- dos: 5-7 prácticas recomendadas de comunicación
- donts: 5-7 prácticas a evitar
- examples: 3 ejemplos con contexto, versión buena y versión mala

Schema JSON esperado:
{
  "tone": "descripción del tono...",
  "personality": ["Atributo 1", "Atributo 2", ...],
  "dos": ["Hacer esto...", "Hacer aquello...", ...],
  "donts": ["Evitar esto...", "Nunca hacer...", ...],
  "examples": [
    { "context": "Email de bienvenida", "good": "...", "bad": "..." },
    { "context": "Redes sociales", "good": "...", "bad": "..." },
    { "context": "Atención al cliente", "good": "...", "bad": "..." }
  ],
  "notes": "observaciones opcionales"
}`,
            },
        ];
    },

    parseOutput(raw: string): ParseResult<VoiceOutput> {
        const result = safeParseJSON<VoiceOutput>(raw);

        if (result.ok && result.data) {
            if (!result.data.tone) {
                return { ok: false, raw, error: "Missing tone description" };
            }
            if (!Array.isArray(result.data.dos) || result.data.dos.length < 3) {
                return { ok: false, raw, error: "Need at least 3 dos" };
            }
            if (!Array.isArray(result.data.donts) || result.data.donts.length < 3) {
                return { ok: false, raw, error: "Need at least 3 donts" };
            }
        }

        return result;
    },
};
