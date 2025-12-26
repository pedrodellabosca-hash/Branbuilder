/**
 * Run Configuration Types
 * 
 * Defines the configuration for running a stage, including
 * preset selection, model choice, and runtime parameters.
 */

import type { PresetLevel } from "./presets";

// =============================================================================
// SUPPORTED MODELS
// =============================================================================

export const AI_PROVIDERS = ["OPENAI", "ANTHROPIC", "MOCK"] as const;
export type AIProvider = typeof AI_PROVIDERS[number];

export const OPENAI_MODELS = [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
] as const;

export const ANTHROPIC_MODELS = [
    "claude-3-5-sonnet-latest",
    "claude-3-5-haiku-latest",
] as const;

export type OpenAIModel = typeof OPENAI_MODELS[number];
export type AnthropicModel = typeof ANTHROPIC_MODELS[number];
export type AIModel = OpenAIModel | AnthropicModel | "mock";

// Model metadata for display
export const MODEL_INFO: Record<string, { name: string; speed: string; quality: string }> = {
    "gpt-4o": { name: "GPT-4o", speed: "Fast", quality: "Excellent" },
    "gpt-4o-mini": { name: "GPT-4o Mini", speed: "Very Fast", quality: "Good" },
    "gpt-4-turbo": { name: "GPT-4 Turbo", speed: "Medium", quality: "Excellent" },
    "claude-3-5-sonnet-latest": { name: "Claude 3.5 Sonnet", speed: "Fast", quality: "Excellent" },
    "claude-3-5-haiku-latest": { name: "Claude 3.5 Haiku", speed: "Very Fast", quality: "Good" },
    "mock": { name: "Mock (Testing)", speed: "Instant", quality: "N/A" },
};

// =============================================================================
// RUN CONFIGURATION
// =============================================================================

export interface RunConfig {
    // Stage context
    stageKey: string;

    // Preset controls scope
    preset: PresetLevel;

    // Model controls quality  
    provider: AIProvider;
    model: AIModel;

    // Generation parameters
    temperature?: number;
    maxOutputTokens?: number;

    // Optional overrides (advanced)
    customInstructions?: string;
}

export interface EffectiveConfig extends RunConfig {
    // Resolved values
    resolvedMaxTokens: number;
    estimatedTokens: number;

    // Preset-specific config
    presetConfig: Record<string, unknown>;
}

// =============================================================================
// DEFAULTS
// =============================================================================

export const DEFAULT_CONFIG: Omit<RunConfig, "stageKey"> = {
    preset: "balanced",
    provider: "OPENAI",
    model: "gpt-4o-mini",
    temperature: 0.7,
};

/**
 * Get default model for a provider
 */
export function getDefaultModel(provider: AIProvider): AIModel {
    switch (provider) {
        case "OPENAI":
            return "gpt-4o-mini";
        case "ANTHROPIC":
            return "claude-3-5-haiku-latest";
        case "MOCK":
            return "mock";
    }
}

/**
 * Validate model for provider
 */
export function isValidModelForProvider(provider: AIProvider, model: string): boolean {
    switch (provider) {
        case "OPENAI":
            return OPENAI_MODELS.includes(model as OpenAIModel);
        case "ANTHROPIC":
            return ANTHROPIC_MODELS.includes(model as AnthropicModel);
        case "MOCK":
            return model === "mock";
    }
}

/**
 * Get all available models for display
 */
export function getAvailableModels(): Array<{ provider: AIProvider; model: AIModel; info: typeof MODEL_INFO[string] }> {
    const models: Array<{ provider: AIProvider; model: AIModel; info: typeof MODEL_INFO[string] }> = [];

    for (const model of OPENAI_MODELS) {
        models.push({ provider: "OPENAI", model, info: MODEL_INFO[model] });
    }

    for (const model of ANTHROPIC_MODELS) {
        models.push({ provider: "ANTHROPIC", model, info: MODEL_INFO[model] });
    }

    return models;
}
