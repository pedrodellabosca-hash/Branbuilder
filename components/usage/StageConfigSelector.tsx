"use client";

import { useState } from "react";
import { TokenBudgetBar, TokenEstimate } from "./TokenBudgetBar";

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

// Available models
const MODELS = [
    { provider: "OPENAI", model: "gpt-4o-mini", name: "GPT-4o Mini", speed: "Muy rápido", quality: "Bueno" },
    { provider: "OPENAI", model: "gpt-4o", name: "GPT-4o", speed: "Rápido", quality: "Excelente" },
    { provider: "ANTHROPIC", model: "claude-3-5-haiku-latest", name: "Claude 3.5 Haiku", speed: "Muy rápido", quality: "Bueno" },
    { provider: "ANTHROPIC", model: "claude-3-5-sonnet-latest", name: "Claude 3.5 Sonnet", speed: "Rápido", quality: "Excelente" },
];

// Token estimates per stage and preset
const TOKEN_ESTIMATES: Record<string, Record<string, number>> = {
    naming: { fast: 800, balanced: 1500, quality: 3000 },
    voice: { fast: 1000, balanced: 2000, quality: 4000 },
    visual_identity: { fast: 1200, balanced: 3000, quality: 5000 },
    // Generic fallback
    default: { fast: 800, balanced: 1800, quality: 3500 },
};

type PresetLevel = "fast" | "balanced" | "quality";

interface StageConfigSelectorProps {
    stageKey: string;
    stageName: string;
    onConfigChange?: (config: { preset: PresetLevel; provider: string; model: string }) => void;
    className?: string;
}

export function StageConfigSelector({
    stageKey,
    stageName,
    onConfigChange,
    className = "",
}: StageConfigSelectorProps) {
    const [preset, setPreset] = useState<PresetLevel>("balanced");
    const [selectedModel, setSelectedModel] = useState(MODELS[0]);
    const [showModelPicker, setShowModelPicker] = useState(false);

    const estimates = TOKEN_ESTIMATES[stageKey] || TOKEN_ESTIMATES.default;
    const estimatedTokens = estimates[preset];

    const handlePresetChange = (newPreset: PresetLevel) => {
        setPreset(newPreset);
        onConfigChange?.({
            preset: newPreset,
            provider: selectedModel.provider,
            model: selectedModel.model,
        });
    };

    const handleModelChange = (model: typeof MODELS[0]) => {
        setSelectedModel(model);
        setShowModelPicker(false);
        onConfigChange?.({
            preset,
            provider: model.provider,
            model: model.model,
        });
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
                                ~{estimates[key].toLocaleString()} tokens
                            </div>
                        </button>
                    )
                )}
            </div>

            {/* Model selector */}
            <div className="relative">
                <button
                    onClick={() => setShowModelPicker(!showModelPicker)}
                    className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-lg">
                            {selectedModel.provider === "OPENAI" ? "🤖" : "🔮"}
                        </div>
                        <div className="text-left">
                            <div className="text-sm font-medium text-white">{selectedModel.name}</div>
                            <div className="text-xs text-zinc-500">
                                {selectedModel.speed} • {selectedModel.quality}
                            </div>
                        </div>
                    </div>
                    <svg
                        className={`w-5 h-5 text-zinc-500 transition-transform ${showModelPicker ? "rotate-180" : ""
                            }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {showModelPicker && (
                    <div className="absolute z-10 w-full mt-2 py-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl">
                        {MODELS.map((model) => (
                            <button
                                key={model.model}
                                onClick={() => handleModelChange(model)}
                                className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-800 transition-colors ${selectedModel.model === model.model ? "bg-zinc-800" : ""
                                    }`}
                            >
                                <div className="w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center text-lg">
                                    {model.provider === "OPENAI" ? "🤖" : "🔮"}
                                </div>
                                <div className="text-left flex-1">
                                    <div className="text-sm font-medium text-white">{model.name}</div>
                                    <div className="text-xs text-zinc-500">
                                        {model.speed} • {model.quality}
                                    </div>
                                </div>
                                {selectedModel.model === model.model && (
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
                )}
            </div>

            {/* Estimated cost */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <span className="text-sm text-zinc-400">Estimado para esta ejecución:</span>
                <span className="text-sm font-medium text-white">
                    ~{estimatedTokens.toLocaleString()} tokens
                </span>
            </div>
        </div>
    );
}

export { TokenBudgetBar, TokenEstimate };
