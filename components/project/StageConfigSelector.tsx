"use client";

import React, { useEffect, useState } from "react";
import {
    ChevronDown,
    ChevronUp,
    Settings2,
    Cpu,
    Zap,
    Check,
    AlertTriangle,
} from "lucide-react";
import { type ModelsResponse, type ModelDescriptor } from "@/lib/ai/model-registry";

interface StageConfigSelectorProps {
    projectId: string;
    stageKey: string;
    defaultConfig?: {
        provider?: string;
        model?: string;
        preset?: string;
    };
}

export const StageConfigSelector: React.FC<StageConfigSelectorProps> = ({
    projectId,
    stageKey,
    defaultConfig,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [modelsData, setModelsData] = useState<ModelsResponse | null>(null);

    // Local state for selections
    const [provider, setProvider] = useState<string>(defaultConfig?.provider || "OPENAI");
    const [model, setModel] = useState<string>(defaultConfig?.model || "");
    const [preset, setPreset] = useState<string>(defaultConfig?.preset || "balanced");

    // Dirty state
    const [isDirty, setIsDirty] = useState(false);
    const [savedStatus, setSavedStatus] = useState<"saved" | "unsaved" | "error">("saved");

    // Fetch models and initial config
    useEffect(() => {
        async function init() {
            try {
                const [modelsRes, configRes] = await Promise.all([
                    fetch("/api/ai/models"),
                    fetch(`/api/projects/${projectId}/stages/${stageKey}/config`)
                ]);

                if (modelsRes.ok) {
                    const data = await modelsRes.json();
                    setModelsData(data);

                    // Set initial defaults if not loaded yet
                    if (!model && data.defaultsByPreset) {
                        const def = data.defaultsByPreset[preset as keyof typeof data.defaultsByPreset];
                        if (def) {
                            setProvider(def.provider);
                            setModel(def.model);
                        }
                    }
                }

                if (configRes.ok) {
                    const savedConfig = await configRes.json();
                    if (savedConfig && savedConfig.provider) {
                        setProvider(savedConfig.provider);
                        setModel(savedConfig.model);
                        setPreset(savedConfig.preset || "balanced");
                    }
                }
            } catch (e) {
                console.error("Failed to load AI config", e);
            } finally {
                setLoading(false);
            }
        }
        init();
    }, [projectId, stageKey]);

    // Handle Preset Change
    const handlePresetChange = (newPreset: string) => {
        setPreset(newPreset);
        // Auto-switch model based on preset default if user hasn't explicitly locked it?
        // For now, let's just use the registry defaults to guide them.
        if (modelsData?.defaultsByPreset) {
            const def = modelsData.defaultsByPreset[newPreset as keyof typeof modelsData.defaultsByPreset];
            if (def) {
                setProvider(def.provider);
                setModel(def.model);
            }
        }
        setIsDirty(true);
        setSavedStatus("unsaved");
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/stages/${stageKey}/config`, {
                method: "PUT",
                body: JSON.stringify({ provider, model, preset }),
            });
            if (res.ok) {
                setSavedStatus("saved");
                setIsDirty(false);
            } else {
                setSavedStatus("error");
            }
        } catch {
            setSavedStatus("error");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return null; // or skeleton

    // Filter models by provider
    const availableModels = modelsData?.models.filter(m => m.provider === provider) || [];
    const selectedModelInfo = availableModels.find(m => m.id === model);

    // Estimation (Mock logic based on preset)
    const maxOutputTokenMap: Record<string, number> = { fast: 4000, balanced: 8000, quality: 16000 };
    const maxTokens = maxOutputTokenMap[preset] || 8000;

    return (
        <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/50">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 flex items-center justify-between text-sm hover:bg-slate-800/50 transition-colors"
            >
                <div className="flex items-center gap-2 text-slate-300">
                    <Settings2 className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">Configuración IA</span>
                    {!isOpen && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 ml-2">
                            <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-400 capitalize">{provider.toLowerCase()}</span>
                            <span>•</span>
                            <span className="truncate max-w-[100px]">{selectedModelInfo?.label || model}</span>
                            <span>•</span>
                            <span className="capitalize text-blue-400">{preset}</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {isDirty && <span className="text-xs text-yellow-500">Sin guardar</span>}
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </div>
            </button>

            {isOpen && (
                <div className="p-4 border-t border-slate-800 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    {/* Preset Selector */}
                    <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950 rounded-lg">
                        {(["fast", "balanced", "quality"] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => handlePresetChange(p)}
                                className={`text-xs py-1.5 px-3 rounded-md transition-all font-medium flex items-center justify-center gap-1.5 ${preset === p
                                    ? "bg-slate-800 text-white shadow-sm ring-1 ring-slate-700"
                                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-900"
                                    }`}
                            >
                                {p === "fast" && <Zap className="w-3 h-3" />}
                                {p === "balanced" && <Cpu className="w-3 h-3" />}
                                {p === "quality" && <Settings2 className="w-3 h-3" />}
                                <span className="capitalize">{p}</span>
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Provider */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-400">Proveedor</label>
                            <select
                                value={provider}
                                onChange={(e) => {
                                    setProvider(e.target.value);
                                    setIsDirty(true);
                                    setSavedStatus("unsaved");
                                    // Reset model when provider changes
                                    const firstModel = modelsData?.models.find(m => m.provider === e.target.value);
                                    if (firstModel) setModel(firstModel.id);
                                }}
                                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 outline-none"
                            >
                                {modelsData?.providers.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>

                        {/* Model */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-400">Modelo</label>
                            <select
                                value={model}
                                onChange={(e) => {
                                    setModel(e.target.value);
                                    setIsDirty(true);
                                    setSavedStatus("unsaved");
                                }}
                                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 outline-none"
                            >
                                {availableModels.map(m => (
                                    <option key={m.id} value={m.id}>{m.label} ({m.tier})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Info Metrics */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/50">
                        <div className="flex gap-4 text-xs text-slate-500 font-mono">
                            <span>Context: {selectedModelInfo?.capabilities.maxContextTokens.toLocaleString() || "N/A"}</span>
                            <span>Max Output: {maxTokens.toLocaleString()}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            {savedStatus === "saved" && !isDirty && (
                                <span className="text-xs text-green-500 flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Guardado
                                </span>
                            )}
                            {savedStatus === "error" && (
                                <span className="text-xs text-red-500 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> Error
                                </span>
                            )}
                            {(isDirty || savedStatus === "unsaved") && (
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-md font-medium transition-colors disabled:opacity-50"
                                >
                                    {saving ? "Guardando..." : "Aplicar Cambios"}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Warning if provider keys missing (Mock check) */}
                    {provider === "OPENAI" && !modelsData?.models.some(m => m.provider === "OPENAI") && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-2 text-xs text-yellow-500 flex gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <p>OpenAI no parece estar configurado o devolvió error. Verifica tus keys en .env.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
