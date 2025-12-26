/**
 * Model Registry
 * 
 * Single source of truth for available AI models.
 * 
 * Features:
 * - Allowlist via environment variables (security/control)
 * - Fallback catalog when dynamic listing fails
 * - Metadata for UI (label, speed, quality, capabilities)
 * - Defaults by preset level
 * 
 * Environment Variables:
 * - OPENAI_MODEL_ALLOWLIST: comma-separated model IDs (empty = defaults only)
 * - ANTHROPIC_MODEL_ALLOWLIST: comma-separated model IDs
 * - MODEL_DEFAULTS_JSON: JSON object with preset -> {provider, model}
 */

import type { PresetLevel } from "./presets";

// =============================================================================
// TYPES
// =============================================================================

export type Provider = "OPENAI" | "ANTHROPIC" | "MOCK";

export interface ModelCapabilities {
    supportsVision: boolean;
    supportsJSON: boolean;
    supportsStreaming: boolean;
    supportsFunctionCalling: boolean;
    maxContextTokens: number;
    maxOutputTokens: number;
}

export interface ModelDescriptor {
    id: string;
    provider: Provider;
    label: string;
    tier: "fast" | "balanced" | "premium";
    speed: "very_fast" | "fast" | "medium" | "slow";
    quality: "good" | "excellent" | "best";
    capabilities: ModelCapabilities;
    deprecated?: boolean;
    deprecatedMessage?: string;
    recommendedForPreset?: PresetLevel[];
}

export interface ModelsResponse {
    activeProvider: Provider;
    providers: Provider[];
    models: ModelDescriptor[];
    defaultsByPreset: Record<PresetLevel, { provider: Provider; model: string }>;
}

// =============================================================================
// FALLBACK CATALOG (used when dynamic listing fails or is not available)
// =============================================================================

const FALLBACK_OPENAI_MODELS: ModelDescriptor[] = [
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
        recommendedForPreset: ["fast"],
    },
    {
        id: "gpt-4o",
        provider: "OPENAI",
        label: "GPT-4o",
        tier: "balanced",
        speed: "fast",
        quality: "excellent",
        capabilities: {
            supportsVision: true,
            supportsJSON: true,
            supportsStreaming: true,
            supportsFunctionCalling: true,
            maxContextTokens: 128000,
            maxOutputTokens: 16384,
        },
        recommendedForPreset: ["balanced", "quality"],
    },
    {
        id: "gpt-4-turbo",
        provider: "OPENAI",
        label: "GPT-4 Turbo",
        tier: "premium",
        speed: "medium",
        quality: "best",
        capabilities: {
            supportsVision: true,
            supportsJSON: true,
            supportsStreaming: true,
            supportsFunctionCalling: true,
            maxContextTokens: 128000,
            maxOutputTokens: 4096,
        },
    },
];

const FALLBACK_ANTHROPIC_MODELS: ModelDescriptor[] = [
    {
        id: "claude-3-5-haiku-latest",
        provider: "ANTHROPIC",
        label: "Claude 3.5 Haiku",
        tier: "fast",
        speed: "very_fast",
        quality: "good",
        capabilities: {
            supportsVision: true,
            supportsJSON: true,
            supportsStreaming: true,
            supportsFunctionCalling: true,
            maxContextTokens: 200000,
            maxOutputTokens: 8192,
        },
        recommendedForPreset: ["fast"],
    },
    {
        id: "claude-3-5-sonnet-latest",
        provider: "ANTHROPIC",
        label: "Claude 3.5 Sonnet",
        tier: "balanced",
        speed: "fast",
        quality: "excellent",
        capabilities: {
            supportsVision: true,
            supportsJSON: true,
            supportsStreaming: true,
            supportsFunctionCalling: true,
            maxContextTokens: 200000,
            maxOutputTokens: 8192,
        },
        recommendedForPreset: ["balanced", "quality"],
    },
];

const MOCK_MODEL: ModelDescriptor = {
    id: "mock",
    provider: "MOCK",
    label: "Mock (Testing)",
    tier: "fast",
    speed: "very_fast",
    quality: "good",
    capabilities: {
        supportsVision: false,
        supportsJSON: true,
        supportsStreaming: false,
        supportsFunctionCalling: false,
        maxContextTokens: 4096,
        maxOutputTokens: 4096,
    },
};

// =============================================================================
// DEFAULT PRESETS (can be overridden by MODEL_DEFAULTS_JSON env var)
// =============================================================================

const DEFAULT_PRESETS: Record<PresetLevel, { provider: Provider; model: string }> = {
    fast: { provider: "OPENAI", model: "gpt-4o-mini" },
    balanced: { provider: "OPENAI", model: "gpt-4o" },
    quality: { provider: "OPENAI", model: "gpt-4o" },
};

// =============================================================================
// ALLOWLIST PARSING
// =============================================================================

function parseAllowlist(envVar: string | undefined): string[] {
    if (!envVar || envVar.trim() === "") {
        return [];
    }
    return envVar.split(",").map(s => s.trim()).filter(Boolean);
}

function getOpenAIAllowlist(): string[] {
    return parseAllowlist(process.env.OPENAI_MODEL_ALLOWLIST);
}

function getAnthropicAllowlist(): string[] {
    return parseAllowlist(process.env.ANTHROPIC_MODEL_ALLOWLIST);
}

// =============================================================================
// DYNAMIC MODEL LISTING (with fallback)
// =============================================================================

/**
 * Attempt to list models from OpenAI API
 * Note: OpenAI's /v1/models endpoint returns all models including embeddings,
 * so we filter by known chat model prefixes and apply allowlist.
 */
async function listOpenAIModels(): Promise<ModelDescriptor[]> {
    const apiKey = process.env.OPENAI_API_KEY;

    // If no API key, use fallback
    if (!apiKey) {
        console.log("[ModelRegistry] No OPENAI_API_KEY, using fallback catalog");
        return filterByAllowlist(FALLBACK_OPENAI_MODELS, getOpenAIAllowlist());
    }

    try {
        const response = await fetch("https://api.openai.com/v1/models", {
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
        });

        if (!response.ok) {
            console.warn("[ModelRegistry] Failed to list OpenAI models, using fallback");
            return filterByAllowlist(FALLBACK_OPENAI_MODELS, getOpenAIAllowlist());
        }

        const data = await response.json();
        const models = data.data as Array<{ id: string; created: number }>;

        // Filter to only gpt-4 and gpt-3.5 models, exclude fine-tuned
        const chatModels = models.filter(m =>
            (m.id.startsWith("gpt-4") || m.id.startsWith("gpt-3.5")) &&
            !m.id.includes("ft:")
        );

        // Merge with fallback to get metadata
        const result = chatModels.map(m => {
            const fallback = FALLBACK_OPENAI_MODELS.find(f => f.id === m.id);
            if (fallback) {
                return fallback;
            }
            // New model not in fallback - provide basic metadata
            return {
                id: m.id,
                provider: "OPENAI" as Provider,
                label: m.id,
                tier: "balanced" as const,
                speed: "fast" as const,
                quality: "good" as const,
                capabilities: {
                    supportsVision: m.id.includes("vision") || m.id.includes("4o"),
                    supportsJSON: true,
                    supportsStreaming: true,
                    supportsFunctionCalling: true,
                    maxContextTokens: 128000,
                    maxOutputTokens: 4096,
                },
            };
        });

        // Apply allowlist
        return filterByAllowlist(result, getOpenAIAllowlist());
    } catch (error) {
        console.error("[ModelRegistry] Error listing OpenAI models:", error);
        return filterByAllowlist(FALLBACK_OPENAI_MODELS, getOpenAIAllowlist());
    }
}

/**
 * List Anthropic models
 * Note: Anthropic doesn't have a public model listing API,
 * so we use the fallback catalog with allowlist filtering.
 */
async function listAnthropicModels(): Promise<ModelDescriptor[]> {
    // Anthropic doesn't provide a model listing API
    // Use fallback with allowlist
    return filterByAllowlist(FALLBACK_ANTHROPIC_MODELS, getAnthropicAllowlist());
}

/**
 * Filter models by allowlist
 * If allowlist is empty, return default models only (models with recommendedForPreset)
 */
function filterByAllowlist(models: ModelDescriptor[], allowlist: string[]): ModelDescriptor[] {
    if (allowlist.length === 0) {
        // Empty allowlist = only show recommended/default models
        return models.filter(m => m.recommendedForPreset && m.recommendedForPreset.length > 0);
    }

    // Filter by allowlist
    return models.filter(m => allowlist.includes(m.id));
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Get all available models
 */
export async function getModels(): Promise<ModelDescriptor[]> {
    const [openai, anthropic] = await Promise.all([
        listOpenAIModels(),
        listAnthropicModels(),
    ]);

    const models = [...openai, ...anthropic];

    // Add mock model in non-production
    if (process.env.NODE_ENV !== "production" || process.env.AI_PROVIDER === "MOCK") {
        models.push(MOCK_MODEL);
    }

    return models;
}

/**
 * Get available providers
 */
export function getProviders(): Provider[] {
    const providers: Provider[] = ["OPENAI", "ANTHROPIC"];

    if (process.env.NODE_ENV !== "production" || process.env.AI_PROVIDER === "MOCK") {
        providers.push("MOCK");
    }

    return providers;
}

/**
 * Get default model for each preset
 */
export function getDefaultsByPreset(): Record<PresetLevel, { provider: Provider; model: string }> {
    // Try to parse from env var
    const envDefaults = process.env.MODEL_DEFAULTS_JSON;

    if (envDefaults) {
        try {
            const parsed = JSON.parse(envDefaults);
            return {
                fast: parsed.fast || parsed.FAST || DEFAULT_PRESETS.fast,
                balanced: parsed.balanced || parsed.BALANCED || DEFAULT_PRESETS.balanced,
                quality: parsed.quality || parsed.QUALITY || parsed.BEST || DEFAULT_PRESETS.quality,
            };
        } catch (error) {
            console.warn("[ModelRegistry] Failed to parse MODEL_DEFAULTS_JSON, using defaults");
        }
    }

    return DEFAULT_PRESETS;
}

/**
 * Get full models response for API
 */
export async function getModelsResponse(): Promise<ModelsResponse> {
    const models = await getModels();

    return {
        activeProvider: (process.env.AI_PROVIDER as Provider) || "OPENAI",
        providers: getProviders(),
        models,
        defaultsByPreset: getDefaultsByPreset(),
    };
}

/**
 * Validate if a model ID is available
 */
export async function isModelAvailable(modelId: string): Promise<boolean> {
    const models = await getModels();
    return models.some(m => m.id === modelId);
}

/**
 * Get model descriptor by ID
 * Returns null if not found (legacy/unavailable)
 */
export async function getModelById(modelId: string): Promise<ModelDescriptor | null> {
    const models = await getModels();
    return models.find(m => m.id === modelId) || null;
}

/**
 * Get legacy model placeholder for unavailable models
 */
export function getLegacyModelDescriptor(modelId: string): ModelDescriptor {
    return {
        id: modelId,
        provider: modelId.startsWith("gpt") ? "OPENAI" :
            modelId.startsWith("claude") ? "ANTHROPIC" : "MOCK",
        label: `${modelId} (Unavailable)`,
        tier: "balanced",
        speed: "medium",
        quality: "good",
        capabilities: {
            supportsVision: false,
            supportsJSON: true,
            supportsStreaming: true,
            supportsFunctionCalling: false,
            maxContextTokens: 4096,
            maxOutputTokens: 4096,
        },
        deprecated: true,
        deprecatedMessage: "This model is no longer available. Please select a different model.",
    };
}
