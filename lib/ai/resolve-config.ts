/**
 * Effective Config Resolver
 * 
 * Resolves the final configuration for a stage run by combining:
 * - User-selected preset (controls scope)
 * - User-selected model (controls quality)
 * - Stage-specific preset config
 * - Token limits
 */

import {
    type RunConfig,
    type EffectiveConfig,
    DEFAULT_CONFIG,
    getDefaultModel,
    isValidModelForProvider,
} from "./config";

// Re-export for convenience
export type { EffectiveConfig } from "./config";
import {
    getPresetConfig,
    getEstimatedTokens,
    getMaxOutputTokens,
    isValidPreset,
    type PresetLevel,
} from "./presets";

export interface ResolveConfigParams {
    stageKey: string;
    preset?: string;
    provider?: string;
    model?: string;
    temperature?: number;
    customInstructions?: string;
    seedText?: string;
}

/**
 * Resolve the effective configuration for a stage run
 * 
 * - Validates and normalizes all inputs
 * - Applies preset config for the stage
 * - Sets token limits based on preset
 * - Falls back to defaults for missing values
 */
export function resolveEffectiveConfig(params: ResolveConfigParams): EffectiveConfig {
    const { stageKey } = params;

    // Resolve preset (default: balanced)
    const preset: PresetLevel = isValidPreset(params.preset || "")
        ? (params.preset as PresetLevel)
        : DEFAULT_CONFIG.preset;

    // Resolve provider (default from env or OPENAI)
    const envProvider = process.env.AI_PROVIDER;
    let provider = params.provider || envProvider || DEFAULT_CONFIG.provider;

    // Normalize provider name
    if (provider === "MOCK" || provider === "mock") {
        provider = "MOCK";
    } else if (provider === "ANTHROPIC" || provider === "anthropic") {
        provider = "ANTHROPIC";
    } else {
        provider = "OPENAI";
    }

    // Resolve model
    let model = params.model;
    if (!model || !isValidModelForProvider(provider as "OPENAI" | "ANTHROPIC" | "MOCK", model)) {
        model = getDefaultModel(provider as "OPENAI" | "ANTHROPIC" | "MOCK");
    }

    // Get preset-specific config
    const presetConfig = getPresetConfig(stageKey, preset);
    const estimatedTokens = getEstimatedTokens(stageKey, preset);
    const maxOutputTokens = getMaxOutputTokens(stageKey, preset);

    // Build effective config
    const config: EffectiveConfig = {
        stageKey,
        preset,
        provider: provider as "OPENAI" | "ANTHROPIC" | "MOCK",
        model: model as EffectiveConfig["model"],
        temperature: params.temperature ?? DEFAULT_CONFIG.temperature,
        maxOutputTokens,
        customInstructions: params.customInstructions,
        seedText: params.seedText,

        // Resolved values
        resolvedMaxTokens: maxOutputTokens,
        estimatedTokens,
        presetConfig: presetConfig as unknown as Record<string, unknown>,
    };

    console.log(`[Config] Resolved: stage=${stageKey} preset=${preset} provider=${provider} model=${model} maxTokens=${maxOutputTokens}`);

    return config;
}

/**
 * Serialize config for storage in Job payload
 */
export function serializeConfig(config: EffectiveConfig): Record<string, unknown> {
    return {
        stageKey: config.stageKey,
        preset: config.preset,
        provider: config.provider,
        model: config.model,
        temperature: config.temperature,
        maxOutputTokens: config.maxOutputTokens,
        customInstructions: config.customInstructions,
        seedText: config.seedText,
        estimatedTokens: config.estimatedTokens,
        presetConfig: config.presetConfig,
    };
}

/**
 * Deserialize config from Job payload
 */
export function deserializeConfig(payload: Record<string, unknown>): EffectiveConfig | null {
    if (!payload?.stageKey || !payload?.preset) {
        return null;
    }

    return {
        stageKey: payload.stageKey as string,
        preset: payload.preset as PresetLevel,
        provider: (payload.provider as EffectiveConfig["provider"]) || "OPENAI",
        model: (payload.model as EffectiveConfig["model"]) || "gpt-4o-mini",
        temperature: (payload.temperature as number) || 0.7,
        maxOutputTokens: (payload.maxOutputTokens as number) || 1200,
        resolvedMaxTokens: (payload.maxOutputTokens as number) || 1200,
        estimatedTokens: (payload.estimatedTokens as number) || 1500,
        presetConfig: (payload.presetConfig as Record<string, unknown>) || {},
        seedText: (payload.seedText as string) || undefined,
    };
}
