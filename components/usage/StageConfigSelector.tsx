"use client";

import { useState, useEffect } from "react";
import { TokenBudgetBar } from "./TokenBudgetBar";
import { useModels, isLegacyModel, getLegacyModelPlaceholder } from "@/hooks/useModels";
import type { ModelDescriptor, Provider } from "@/hooks/useModels";
import {
    NAMING_PRESETS,
    VOICE_PRESETS,
    VISUAL_PRESETS,
    GENERIC_PRESETS,
    type PresetLevel
} from "@/lib/ai/presets";

// Preset info for display
const PRESET_INFO = {
    fast: {
        name: "Rápido",
        description: "Resultados rápidos, menos variantes",
        icon: "⚡",
        color: "text-yellow-400",
        bgColor: "bg-yellow-500/10",
    },
    balanced: {
        name: "Balanceado",
        description: "Buena calidad/costo",
        icon: "⚖️",
        color: "text-blue-400",
        bgColor: "bg-blue-500/10",
    },
    quality: {
        name: "Calidad",
        description: "Máxima profundidad",
        icon: "✨",
        color: "text-purple-400",
        bgColor: "bg-purple-500/10",
    },
};

// Helper: Get estimates from presets
function getPresetEstimates(stageKey: string, preset: PresetLevel) {
    let config;
    switch (stageKey) {
        case "naming": config = NAMING_PRESETS[preset]; break;
        case "voice": config = VOICE_PRESETS[preset]; break;
        case "visual_identity": config = VISUAL_PRESETS[preset]; break;
        default: config = GENERIC_PRESETS[preset]; break;
    }
    return {
        min: config.estimatedTokensMin,
        max: config.estimatedTokensMax,
        avg: config.estimatedTokens
    };
}

interface StageConfigSelectorProps {
    stageKey: string;
    stageName: string;
    initialModel?: string;
    onConfigChange?: (config: { preset: PresetLevel; provider: string; model: string }) => void;
    className?: string;
}

export function StageConfigSelector({
    stageKey,
    stageName,
    initialModel,
    onConfigChange,
    className = "",
}: StageConfigSelectorProps) {
    const { models, loading, defaultsByPreset, getRecommendedModel, isModelAvailable } = useModels();

    const [preset, setPreset] = useState<PresetLevel>("balanced");
    const [selectedModelId, setSelectedModelId] = useState<string | null>(initialModel || null);
    const [showModelPicker, setShowModelPicker] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Calculate estimates for all presets to display in the selector
    const allPresetEstimates = {
        fast: getPresetEstimates(stageKey, "fast"),
        balanced: getPresetEstimates(stageKey, "balanced"),
        quality: getPresetEstimates(stageKey, "quality"),
    };

    const estimates = allPresetEstimates[preset];

    // Get the selected model descriptor
    const selectedModel: ModelDescriptor | null = selectedModelId
        ? models.find(m => m.id === selectedModelId) ||
        (isLegacyModel(selectedModelId, models) ? getLegacyModelPlaceholder(selectedModelId) : null)
        : getRecommendedModel(preset);

    // Check if selected model is legacy/unavailable
    const isLegacy = selectedModelId ? !isModelAvailable(selectedModelId) : false;

    // Group models by provider
    const modelsByProvider = models.reduce<Record<Provider, ModelDescriptor[]>>((acc, model) => {
        if (!acc[model.provider]) {
            acc[model.provider] = [];
        }
        acc[model.provider].push(model);
        return acc;
    }, {} as Record<Provider, ModelDescriptor[]>);

    // Set default model when preset changes
    useEffect(() => {
        if (!selectedModelId && defaultsByPreset) {
            const defaultConfig = defaultsByPreset[preset];
            setSelectedModelId(defaultConfig.model);
        }
    }, [preset, defaultsByPreset, selectedModelId]);

    const handlePresetChange = (newPreset: PresetLevel) => {
        setPreset(newPreset);

        // Update to recommended model for this preset if not manually selected
        if (!showAdvanced) {
            const defaultConfig = defaultsByPreset[newPreset];
            setSelectedModelId(defaultConfig.model);
            onConfigChange?.({
                preset: newPreset,
                provider: defaultConfig.provider,
                model: defaultConfig.model,
            });
        } else if (selectedModel) {
            onConfigChange?.({
                preset: newPreset,
                provider: selectedModel.provider,
                model: selectedModel.id,
            });
        }
    };

    const handleModelChange = (model: ModelDescriptor) => {
        setSelectedModelId(model.id);
        setShowModelPicker(false);
        onConfigChange?.({
            preset,
            provider: model.provider,
            model: model.id,
        });
    };

    const handleUseRecommended = () => {
        const recommended = getRecommendedModel(preset);
        if (recommended) {
            handleModelChange(recommended);
        }
    };

    const getProviderIcon = (provider: Provider) => {
        switch (provider) {
            case "OPENAI": return "🤖";
            case "ANTHROPIC": return "🔮";
            case "MOCK": return "🧪";
            default: return "🤖";
        }
    };

    const getSpeedLabel = (speed: string) => {
        switch (speed) {
            case "very_fast": return "Muy rápido";
            case "fast": return "Rápido";
            case "medium": return "Medio";
            case "slow": return "Lento";
            default: return speed;
        }
    };

    const getQualityLabel = (quality: string) => {
        switch (quality) {
            case "good": return "Bueno";
            case "excellent": return "Excelente";
            case "best": return "El mejor";
            default: return quality;
        }
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Stage header with token budget */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">{stageName}</h3>
                <TokenBudgetBar compact />
            </div>

            {/* Preset selector */}
            <div className="grid grid-cols-3 gap-2">
                {(Object.entries(PRESET_INFO) as [PresetLevel, typeof PRESET_INFO.fast][]).map(
                    ([key, info]) => (
                        <button
                            key={key}
                            onClick={() => handlePresetChange(key)}
                            className={`p-3 rounded-xl border transition-all ${preset === key
                                    ? `${info.bgColor} border-current ${info.color}`
                                    : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                                }`}
                        >
                            <div className="text-2xl mb-1">{info.icon}</div>
                            <div className={`text-sm font-medium ${preset === key ? info.color : "text-white"}`}>
                                {info.name}
                            </div>
                            <div className="text-xs text-zinc-500 mt-1">
                                ~{allPresetEstimates[key].avg.toLocaleString()} tokens
                            </div>
                        </button>
                    )
                )}
            </div>

            {/* Advanced toggle */}
            <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full text-sm text-zinc-500 hover:text-zinc-400 transition-colors flex items-center justify-center gap-2"
            >
                {showAdvanced ? "Ocultar opciones avanzadas" : "Mostrar opciones avanzadas"}
                <svg
                    className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Model selector (advanced) */}
            {showAdvanced && (
                <div className="relative">
                    {/* Legacy model warning */}
                    {isLegacy && selectedModel && (
                        <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                            <div className="flex items-start gap-3">
                                <span className="text-red-400 text-lg">⚠️</span>
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-red-400">Modelo no disponible</div>
                                    <div className="text-xs text-red-400/70 mt-1">
                                        {selectedModel.deprecatedMessage || "Este modelo ya no está disponible."}
                                    </div>
                                    <button
                                        onClick={handleUseRecommended}
                                        className="mt-2 text-xs font-medium text-blue-400 hover:text-blue-300"
                                    >
                                        Usar modelo recomendado →
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => setShowModelPicker(!showModelPicker)}
                        disabled={loading}
                        className={`w-full p-3 rounded-xl border transition-all flex items-center justify-between ${isLegacy
                                ? "bg-red-900/20 border-red-500/30"
                                : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                            } ${loading ? "opacity-50 cursor-wait" : ""}`}
                    >
                        {loading ? (
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-zinc-800 animate-pulse" />
                                <div className="text-sm text-zinc-400">Cargando modelos...</div>
                            </div>
                        ) : selectedModel ? (
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-lg">
                                    {getProviderIcon(selectedModel.provider)}
                                </div>
                                <div className="text-left">
                                    <div className={`text-sm font-medium ${isLegacy ? "text-red-400" : "text-white"}`}>
                                        {selectedModel.label}
                                        {selectedModel.recommendedForPreset?.includes(preset) && (
                                            <span className="ml-2 text-xs text-emerald-400">Recomendado</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                        {getSpeedLabel(selectedModel.speed)} • {getQualityLabel(selectedModel.quality)}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-zinc-400">Seleccionar modelo</div>
                        )}
                        <svg
                            className={`w-5 h-5 text-zinc-500 transition-transform ${showModelPicker ? "rotate-180" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {showModelPicker && !loading && (
                        <div className="absolute z-10 w-full mt-2 py-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl max-h-80 overflow-auto">
                            {Object.entries(modelsByProvider).map(([provider, providerModels]) => (
                                <div key={provider}>
                                    <div className="px-4 py-2 text-xs font-medium text-zinc-500 uppercase">
                                        {getProviderIcon(provider as Provider)} {provider}
                                    </div>
                                    {providerModels.map((model) => (
                                        <button
                                            key={model.id}
                                            onClick={() => handleModelChange(model)}
                                            className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-800 transition-colors ${selectedModelId === model.id ? "bg-zinc-800" : ""
                                                }`}
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center text-lg">
                                                {getProviderIcon(model.provider)}
                                            </div>
                                            <div className="text-left flex-1">
                                                <div className="text-sm font-medium text-white flex items-center gap-2">
                                                    {model.label}
                                                    {model.recommendedForPreset?.includes(preset) && (
                                                        <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                                                            Recomendado
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-zinc-500">
                                                    {getSpeedLabel(model.speed)} • {getQualityLabel(model.quality)}
                                                </div>
                                            </div>
                                            {selectedModelId === model.id && (
                                                <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Estimated cost */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <span className="text-sm text-zinc-400">Estimado para esta ejecución:</span>
                <span className="text-sm font-medium text-white">
                    ~{estimates.avg.toLocaleString()} tokens
                </span>
            </div>
        </div>
    );
}
