/**
 * AI Provider Factory
 * 
 * Returns the configured AI provider based on environment.
 * Default: MOCK (safe for development)
 */

import type { AIProvider, AIProviderType } from "./types";
import { MockAIProvider } from "./provider_mock";
import { OpenAIProvider } from "./provider_openai";
import { AnthropicProvider } from "./provider_anthropic";

// Re-export types for convenience
export type { AIProvider, AIRequest, AIResponse, AIProviderStatus, AIMessage } from "./types";

const providerCache: Partial<Record<AIProviderType, AIProvider>> = {};

/**
 * Get the configured AI provider.
 * Uses AI_PROVIDER env var: "OPENAI" | "MOCK" (default: MOCK)
 * Respects AI_MOCK_MODE=1 to force mock provider
 */
export function getAIProvider(overrideType?: string): AIProvider {
    // 1. Force Mock if env var is set
    if (process.env.AI_MOCK_MODE === "1") {
        if (!providerCache["MOCK"]) {
            providerCache["MOCK"] = new MockAIProvider();
        }
        return providerCache["MOCK"]!;
    }

    const defaultType = (process.env.AI_PROVIDER || "MOCK").toUpperCase() as AIProviderType;
    const type = (overrideType?.toUpperCase() as AIProviderType) || defaultType;

    if (providerCache[type]) {
        return providerCache[type]!;
    }

    let provider: AIProvider;

    switch (type) {
        case "OPENAI":
            provider = new OpenAIProvider();
            break;
        case "ANTHROPIC":
            provider = new AnthropicProvider();
            break;
        case "MOCK":
        default:
            provider = new MockAIProvider();
            break;
    }

    providerCache[type] = provider;
    return provider;
}

/**
 * Get provider type without instantiating
 */
export function getAIProviderType(): AIProviderType {
    if (process.env.AI_MOCK_MODE === "1") return "MOCK";
    const type = (process.env.AI_PROVIDER || "MOCK").toUpperCase();
    return type === "OPENAI" || type === "ANTHROPIC" ? type as AIProviderType : "MOCK";
}

/**
 * Reset cached provider (useful for testing)
 */
export function resetAIProvider(): void {
    Object.keys(providerCache).forEach((key) => {
        delete providerCache[key as keyof typeof providerCache];
    });
}
