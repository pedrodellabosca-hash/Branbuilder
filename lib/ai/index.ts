/**
 * AI Provider Factory
 * 
 * Returns the configured AI provider based on environment.
 * Default: MOCK (safe for development)
 */

import type { AIProvider, AIProviderType } from "./types";
import { MockAIProvider } from "./provider_mock";
import { OpenAIProvider } from "./provider_openai";

// Re-export types for convenience
export type { AIProvider, AIRequest, AIResponse, AIProviderStatus, AIMessage } from "./types";

let cachedProvider: AIProvider | null = null;

/**
 * Get the configured AI provider.
 * Uses AI_PROVIDER env var: "OPENAI" | "MOCK" (default: MOCK)
 */
export function getAIProvider(): AIProvider {
    if (cachedProvider) {
        return cachedProvider;
    }

    const providerType = (process.env.AI_PROVIDER || "MOCK").toUpperCase() as AIProviderType;

    switch (providerType) {
        case "OPENAI":
            cachedProvider = new OpenAIProvider();
            break;
        case "MOCK":
        default:
            cachedProvider = new MockAIProvider();
            break;
    }

    console.log(`[AI] Provider initialized: ${cachedProvider.type}`);
    return cachedProvider;
}

/**
 * Get provider type without instantiating
 */
export function getAIProviderType(): AIProviderType {
    const type = (process.env.AI_PROVIDER || "MOCK").toUpperCase();
    return type === "OPENAI" ? "OPENAI" : "MOCK";
}

/**
 * Reset cached provider (useful for testing)
 */
export function resetAIProvider(): void {
    cachedProvider = null;
}
