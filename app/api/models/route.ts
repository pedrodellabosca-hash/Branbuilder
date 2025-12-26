/**
 * GET /api/models
 * 
 * Returns available AI models from the model registry.
 * This is the single source of truth for frontend model selection.
 * 
 * Response:
 * {
 *   providers: ["OPENAI", "ANTHROPIC", "MOCK"],
 *   models: [{ id, provider, label, tier, speed, quality, capabilities, ... }],
 *   defaultsByPreset: { fast: {...}, balanced: {...}, quality: {...} }
 * }
 */

import { NextResponse } from "next/server";
import { getModelsResponse } from "@/lib/ai/model-registry";

// Cache for 5 minutes (models don't change frequently)
export const revalidate = 300;

export async function GET() {
    try {
        const response = await getModelsResponse();

        return NextResponse.json(response, {
            headers: {
                "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
            },
        });
    } catch (error) {
        console.error("[API] Error fetching models:", error);

        // Return minimal fallback response
        return NextResponse.json({
            activeProvider: process.env.AI_PROVIDER || "OPENAI", // Expose active provider
            providers: ["OPENAI"],
            models: [
                {
                    id: "gpt-4o-mini",
                    provider: "OPENAI",
                    label: "GPT-4o Mini",
                    tier: "fast",
                    speed: "very_fast",
                    quality: "good",
                    capabilities: {
                        supportsVision: true,
                        supportsJSON: true,
                        supportsStreaming: true,
                        supportsFunctionCalling: true,
                        maxContextTokens: 128000,
                        maxOutputTokens: 16384,
                    },
                    recommendedForPreset: ["fast", "balanced", "quality"],
                },
            ],
            defaultsByPreset: {
                fast: { provider: "OPENAI", model: "gpt-4o-mini" },
                balanced: { provider: "OPENAI", model: "gpt-4o-mini" },
                quality: { provider: "OPENAI", model: "gpt-4o-mini" },
            },
        }, { status: 200 });
    }
}
