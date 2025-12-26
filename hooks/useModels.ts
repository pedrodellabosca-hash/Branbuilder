"use client";

import { useState, useEffect, useCallback } from "react";
import type { ModelsResponse, ModelDescriptor, Provider } from "@/lib/ai/model-registry";

// =============================================================================
// TYPES (re-exported for convenience)
// =============================================================================

export type { ModelsResponse, ModelDescriptor, Provider };

type PresetLevel = "fast" | "balanced" | "quality";

// =============================================================================
// CACHE
// =============================================================================

let modelsCache: ModelsResponse | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// =============================================================================
// HOOK
// =============================================================================

interface UseModelsReturn {
    activeProvider: Provider | null;
    models: ModelDescriptor[];
    providers: Provider[];
    defaultsByPreset: Record<PresetLevel, { provider: Provider; model: string }>;
    loading: boolean;
    error: string | null;
    getModelById: (id: string) => ModelDescriptor | null;
    getModelsForProvider: (provider: Provider) => ModelDescriptor[];
    getRecommendedModel: (preset: PresetLevel) => ModelDescriptor | null;
    isModelAvailable: (id: string) => boolean;
    refresh: () => Promise<void>;
}

export function useModels(): UseModelsReturn {
    const [data, setData] = useState<ModelsResponse | null>(modelsCache);
    const [loading, setLoading] = useState(!modelsCache);
    const [error, setError] = useState<string | null>(null);

    const fetchModels = useCallback(async (force = false) => {
        // Check cache
        if (!force && modelsCache && Date.now() - cacheTimestamp < CACHE_TTL) {
            setData(modelsCache);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/models");

            if (!response.ok) {
                throw new Error(`Failed to fetch models: ${response.status}`);
            }

            const json = await response.json();

            // Update cache
            modelsCache = json;
            cacheTimestamp = Date.now();

            setData(json);
        } catch (err) {
            console.error("[useModels] Error:", err);
            setError(err instanceof Error ? err.message : "Failed to load models");

            // Use cached data if available
            if (modelsCache) {
                setData(modelsCache);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchModels();
    }, [fetchModels]);

    // Helper functions
    const getModelById = useCallback((id: string): ModelDescriptor | null => {
        return data?.models.find(m => m.id === id) || null;
    }, [data]);

    const getModelsForProvider = useCallback((provider: Provider): ModelDescriptor[] => {
        return data?.models.filter(m => m.provider === provider) || [];
    }, [data]);

    const getRecommendedModel = useCallback((preset: PresetLevel): ModelDescriptor | null => {
        if (!data) return null;

        const defaultConfig = data.defaultsByPreset[preset];
        return data.models.find(m =>
            m.provider === defaultConfig.provider && m.id === defaultConfig.model
        ) || data.models[0] || null;
    }, [data]);

    const isModelAvailable = useCallback((id: string): boolean => {
        return data?.models.some(m => m.id === id) ?? false;
    }, [data]);

    return {
        activeProvider: data?.activeProvider || null,
        models: data?.models || [],
        providers: data?.providers || [],
        defaultsByPreset: data?.defaultsByPreset || {
            fast: { provider: "OPENAI", model: "gpt-4o-mini" },
            balanced: { provider: "OPENAI", model: "gpt-4o-mini" },
            quality: { provider: "OPENAI", model: "gpt-4o-mini" },
        },
        loading,
        error,
        getModelById,
        getModelsForProvider,
        getRecommendedModel,
        isModelAvailable,
        refresh: () => fetchModels(true),
    };
}

// =============================================================================
// UTILITY: Legacy model check
// =============================================================================

export function isLegacyModel(modelId: string, availableModels: ModelDescriptor[]): boolean {
    return !availableModels.some(m => m.id === modelId);
}

export function getLegacyModelPlaceholder(modelId: string): ModelDescriptor {
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
