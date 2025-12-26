/**
 * Run Configuration Types
 * 
 * Defines the configuration for running a stage, including
 * preset selection, model choice, and runtime parameters.
 * 
 * NOTE: Model lists are now managed by model-registry.ts
 * This file maintains backward compatibility for existing code.
 */

import type { PresetLevel } from "./presets";

// =============================================================================
// TYPES
// =============================================================================

export const AI_PROVIDERS = ["OPENAI", "ANTHROPIC", "MOCK"] as const;
export type AIProvider = typeof AI_PROVIDERS[number];

/**
 * Model ID is now a string - models are validated at runtime via registry
 * @deprecated Use model-registry.ts for model validation
 */
export type AIModel = string;

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
    model: string;  // Dynamic - validated by registry

    // Generation parameters
    temperature?: number;
    maxOutputTokens?: number;

    // Optional overrides (advanced)
    // Optional overrides (advanced)
    customInstructions?: string;
    seedText?: string;
}

export interface EffectiveConfig extends RunConfig {
    // Resolved values
    resolvedMaxTokens: number;
    estimatedTokens: number;

    // Preset-specific config
    presetConfig: Record<string, unknown>;

    // Runtime metadata
    fallbackWarning?: string;
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
 * NOTE: For dynamic defaults, use model-registry.getDefaultsByPreset()
 */
export function getDefaultModel(provider: AIProvider): string {
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
 * Basic provider validation
 * For full model validation, use model-registry.isModelAvailable()
 */
export function isValidModelForProvider(provider: AIProvider, model: string): boolean {
    // Basic validation - model must not be empty
    if (!model || model.trim() === "") return false;

    // Provider prefix validation
    switch (provider) {
        case "OPENAI":
            return model.startsWith("gpt-") || model.startsWith("o1");
        case "ANTHROPIC":
            return model.startsWith("claude-");
        case "MOCK":
            return model === "mock";
    }
}
