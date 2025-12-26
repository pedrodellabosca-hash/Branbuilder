/**
 * Context Stage Prompt
 * 
 * Generates initial brand context and positioning analysis
 */

import type { AIMessage } from "@/lib/ai";
import type { StagePrompt, PromptContext, ParseResult } from "../types";
import { createSystemMessage, safeParseJSON } from "../types";

export interface ContextOutput {
    marketSummary: string;
    targetAudience: {
        demographics: string;
        psychographics: string;
        painPoints: string[];
        needs: string[];
    };
    competitorAnalysis: {
        direct: string[];
        indirect: string[];
        differentiation: string;
    };
    positioningStatement: string;
}

export const contextPrompt: StagePrompt<ContextOutput> = {
    id: "context-v1",
    version: "0.1.0",
    title: "Contexto & Posicionamiento",
    stageKey: "context",

    buildMessages(context: PromptContext): AIMessage[] {
        const action = context.isRegenerate ? "Regenera" : "Genera";
        const userInput = (context as any).projectContext || "No context provided";

        return [
            createSystemMessage("experto en estrategia de marca y análisis de mercado"),
            {
                role: "user",
                content: `${action} un análisis de contexto y posicionamiento para una marca basado en la siguiente información:

${JSON.stringify(userInput, null, 2)}

${context.seedText ? `IMPORTANTE: El usuario ha proporcionado una versión editada/borrador para guiar esta generación. Úsala como base principal y refínala/expándela según sea necesario:\n\n"${context.seedText}"\n` : ""}

El análisis debe incluir:
1. Resumen del mercado
2. Análisis detallado de audiencia (demografía, psicografía, dolores, necesidades)
3. Análisis de competencia
4. Declaración de posicionamiento

Schema JSON esperado:
{
  "marketSummary": "...",
  "targetAudience": {
    "demographics": "...",
    "psychographics": "...",
    "painPoints": ["...", "..."],
    "needs": ["...", "..."]
  },
  "competitorAnalysis": {
    "direct": ["...", "..."],
    "indirect": ["...", "..."],
    "differentiation": "..."
  },
  "positioningStatement": "..."
}`,
            },
        ];
    },

    parseOutput(raw: string): ParseResult<ContextOutput> {
        return safeParseJSON<ContextOutput>(raw);
    },
};
