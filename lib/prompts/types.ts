/**
 * Stage Prompt Types
 * 
 * Common types for all stage prompts
 */

import type { AIMessage } from "@/lib/ai";

export interface PromptContext {
    stageName: string;
    stageKey: string;
    isRegenerate: boolean;
    projectName?: string;
    previousContent?: object;
    presetConfig?: Record<string, unknown>;
    seedText?: string;
}

export interface ParseResult<T = object> {
    ok: boolean;
    data?: T;
    raw: string;
    error?: string;
}

export interface StagePrompt<T = object> {
    /** Unique prompt identifier */
    id: string;
    /** Semver version for tracking */
    version: string;
    /** Human-readable title */
    title: string;
    /** Stage key this prompt is for */
    stageKey: string;
    /** Build messages for AI completion */
    buildMessages: (context: PromptContext) => AIMessage[];
    /** Parse and validate AI output */
    parseOutput: (raw: string) => ParseResult<T>;
}

/**
 * Helper to create system message with consistent format
 */
export function createSystemMessage(role: string): AIMessage {
    return {
        role: "system",
        content: `Eres un experto consultor de branding y estrategia de marca con ${role}.
Tu rol es generar contenido profesional, creativo y accionable.
Responde SIEMPRE en español.
Responde SIEMPRE en formato JSON válido según el schema especificado.
No incluyas markdown, solo JSON puro.`,
    };
}

/**
 * Helper to safely parse JSON from AI response
 */
export function safeParseJSON<T>(raw: string): ParseResult<T> {
    try {
        // Try to extract JSON from response (handle markdown code blocks)
        let jsonStr = raw.trim();

        // Remove markdown code blocks if present
        if (jsonStr.startsWith("```json")) {
            jsonStr = jsonStr.replace(/^```json\n?/, "").replace(/\n?```$/, "");
        } else if (jsonStr.startsWith("```")) {
            jsonStr = jsonStr.replace(/^```\n?/, "").replace(/\n?```$/, "");
        }

        const data = JSON.parse(jsonStr) as T;
        return { ok: true, data, raw };
    } catch (error) {
        return {
            ok: false,
            raw,
            error: error instanceof Error ? error.message : "Invalid JSON",
        };
    }
}
