"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Play, RefreshCw, CheckCircle, Loader2, AlertCircle, Clock, Sparkles, Pencil, X, Save } from "lucide-react";

interface StageActionsProps {
    projectId: string;
    stageId: string;
    stageKey: string;
    module: "A" | "B";
    status: string;
    initialJobId?: string;
    initialJobStatus?: string;
}

type JobStatus = "QUEUED" | "PROCESSING" | "DONE" | "FAILED";

interface OutputVersion {
    id: string;
    version: number;
    content: unknown;
    provider: string | null;
    model: string | null;
    status: string;
    type: string;
    createdAt: string;
    runInfo?: {
        provider: string;
        model: string;
        preset: string | null;
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        multiplier?: number;
        billedTokens?: number;
    };
}

interface OutputData {
    stage: { id: string; stageKey: string; name: string; status: string } | null;
    output: { id: string; name: string; outputKey: string } | null;
    versions: OutputVersion[];
    latestVersion: OutputVersion | null;
    currentVersion?: OutputVersion | null;
}

export function StageActions({
    projectId,
    stageId,
    stageKey,
    module,
    status,
    initialJobId,
    initialJobStatus,
}: StageActionsProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [jobId, setJobId] = useState<string | null>(initialJobId || null);
    const [jobStatus, setJobStatus] = useState<JobStatus | null>(
        (initialJobStatus as JobStatus) || null
    );

    // Output state (fetched from /output endpoint)
    const [outputData, setOutputData] = useState<OutputData | null>(null);
    const [isLoadingOutput, setIsLoadingOutput] = useState(false);

    // Editing State
    const [isEditing, setIsEditing] = useState(false);
    const [seedText, setSeedText] = useState("");


    const canGenerate = status === "NOT_STARTED";
    const canRegenerate = status === "GENERATED" || status === "APPROVED" || status === "REGENERATED";
    const canApprove = status === "GENERATED" || status === "REGENERATED";

    // Anti-spam cooldown (900ms minimum between clicks)
    const COOLDOWN_MS = 900;
    const [cooldownUntil, setCooldownUntil] = useState(0);
    const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const isMountedRef = useRef(true);

    // State for version navigation
    const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

    // Fetch output data from /output endpoint with abort support
    const fetchOutput = useCallback(async (version?: number) => {
        if (!projectId || !stageKey) return;

        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setIsLoadingOutput(true);
        try {
            const url = version
                ? `/api/projects/${projectId}/stages/${stageKey}/output?version=${version}`
                : `/api/projects/${projectId}/stages/${stageKey}/output`;

            const response = await fetch(url, {
                signal: abortControllerRef.current.signal,
            });

            // Check if component unmounted during fetch
            if (!isMountedRef.current) return;

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("Authentication required");
                }
                throw new Error("Error fetching output");
            }
            const data: OutputData = await response.json();
            if (isMountedRef.current) {
                setOutputData(data);
                // Sync selected version state with what was returned (if we asked for a specific one)
                if (version) {
                    setSelectedVersion(version);
                } else {
                    setSelectedVersion(null); // Reset to latest
                }
            }
        } catch (err) {
            // Ignore abort errors
            if (err instanceof Error && err.name === "AbortError") return;
            console.error("[StageActions] Error fetching output:", err);
            // Don't set error for initial load failures - just no data
        } finally {
            if (isMountedRef.current) {
                setIsLoadingOutput(false);
            }
        }
    }, [projectId, stageKey]);

    const handleVersionClick = (version: number) => {
        if (version === selectedVersion) return; // Already selected
        fetchOutput(version);
    };

    const handleBackToLatest = () => {
        fetchOutput(); // No args = latest
    };

    // Fetch output on mount and when status changes
    useEffect(() => {
        fetchOutput();
    }, [fetchOutput, status]);

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (cooldownTimerRef.current) {
                clearTimeout(cooldownTimerRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // Deterministic: in cooldown if value > 0
    const inCooldown = cooldownUntil > 0;

    const enqueueJob = async (useDraft = false) => {
        // Guard: prevent double-click and cooldown
        if (isLoading || inCooldown) return;

        setIsLoading(true);
        setError(null);

        // Validate projectId is present (before cooldown so error doesn't trigger cooldown)
        if (!projectId || !stageKey) {
            setError("Error: projectId o stageKey no disponible");
            setIsLoading(false);
            return;
        }

        // Set cooldown AFTER validation passes (1 = active, 0 = inactive)
        setCooldownUntil(1);

        // Clear previous timer and schedule reset
        if (cooldownTimerRef.current) {
            clearTimeout(cooldownTimerRef.current);
        }
        cooldownTimerRef.current = setTimeout(() => {
            setCooldownUntil(0);
            cooldownTimerRef.current = null;
        }, COOLDOWN_MS);

        console.log("[StageActions] Running stage:", { projectId, stageKey, useDraft });

        const formatRunError = (message: string) => {
            if (message.includes("PROVIDER_NOT_CONFIGURED") || message.includes("AI Provider not configured")) {
                return "Proveedor de IA no configurado. Agrega API keys o activa AI_MOCK_MODE=1.";
            }
            if (message.includes("STAGE_LOCKED")) {
                return "La etapa esta bloqueada por otro usuario. Intenta mas tarde.";
            }
            if (message.includes("MISSING_DEPENDENCY")) {
                return `Faltan dependencias para ejecutar la etapa. ${message}`;
            }
            return message;
        };

        try {
            // Use new /run endpoint (handles idempotency server-side)
            const response = await fetch(`/api/projects/${projectId}/stages/${stageKey}/run`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    regenerate: true, // Always regenerate when button clicked here
                    seedText: useDraft ? seedText : undefined
                })
            });

            // Note: The /run endpoint expects body options to be merged into params 
            // In a real implementation we might need to adjust runStage route to accept body overrides
            // For now assuming the route handler maps body to RunStageParams

            if (useDraft) {
                // Exit edit mode on success submission
                setIsEditing(false);
            }

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                if (response.status === 402) {
                    setError(data.error || "Límite de tokens alcanzado.");
                    setIsLoading(false);
                    return;
                }
                if (response.status === 401) throw new Error("Authentication required");
                const errorMessage = data.error || "Error ejecutando etapa";
                throw new Error(formatRunError(errorMessage));
            }

            const data = await response.json();
            setJobId(data.jobId);
            setJobStatus(data.status || "QUEUED");

            // If idempotent response (job already running), continue polling
            if (data.idempotent) {
                console.log("[StageActions] Job already in progress:", data.jobId);
            }

            // Handle based on returned status
            if (data.status === "DONE") {
                // DEV mode: job already completed, fetch output and refresh
                await fetchOutput();
                router.refresh();
            } else if (data.status === "FAILED") {
                // Job failed immediately
                setError(data.error || "El job falló durante el procesamiento");
            } else {
                // Start polling
                pollJobStatus(data.jobId);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error desconocido");
        } finally {
            setIsLoading(false);
        }
    };

    const saveManualVersion = async () => {
        if (!projectId || !stageKey) return;
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/projects/${projectId}/stages/${stageKey}/output/version`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: seedText
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Error guardando versión manual");
            }

            // Refresh data and exit edit mode
            await fetchOutput();
            setIsEditing(false);
            router.refresh();

        } catch (err) {
            setError(err instanceof Error ? err.message : "Error desconocido");
        } finally {
            setIsLoading(false);
        }
    };

    const pollJobStatus = async (id: string) => {
        const maxAttempts = 30; // 30 seconds max
        let attempts = 0;

        const poll = async () => {
            try {
                const response = await fetch(`/api/jobs/${id}`);
                if (!response.ok) {
                    throw new Error("Error obteniendo estado del job");
                }

                const data = await response.json();
                setJobStatus(data.status);

                if (data.status === "DONE" || data.status === "FAILED") {
                    if (data.status === "DONE") {
                        // Fetch output first, then refresh page
                        await fetchOutput();
                        router.refresh();
                    } else {
                        // Show error from failed job
                        setError(data.error || "El job falló durante el procesamiento");
                    }
                    return;
                }

                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(poll, 1000);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error polling");
            }
        };

        poll();
    };

    const approveStage = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/projects/${projectId}/stages/${stageKey}/approve`, {
                method: "POST",
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Error aprobando etapa");
            }

            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error desconocido");
        } finally {
            setIsLoading(false);
        }
    };

    const getJobStatusUI = () => {
        if (!jobId || !jobStatus) return null;

        const statusConfig = {
            QUEUED: {
                icon: Loader2,
                text: "En cola...",
                color: "text-yellow-400",
                animate: true,
            },
            PROCESSING: {
                icon: Loader2,
                text: "Procesando...",
                color: "text-blue-400",
                animate: true,
            },
            DONE: {
                icon: CheckCircle,
                text: "Completado",
                color: "text-green-400",
                animate: false,
            },
            FAILED: {
                icon: AlertCircle,
                text: "Error",
                color: "text-red-400",
                animate: false,
            },
        };

        const config = statusConfig[jobStatus] || statusConfig.FAILED;
        const Icon = config.icon;

        return (
            <div className={`flex items-center gap-2 ${config.color}`}>
                <Icon className={`w-4 h-4 ${config.animate ? "animate-spin" : ""}`} />
                <span className="text-sm">{config.text}</span>
            </div>
        );
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("es", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const renderContent = (content: unknown): string => {
        if (typeof content === "string") return content;
        if (content && typeof content === "object") {
            return JSON.stringify(content, null, 2);
        }
        return String(content || "");
    };

    // Use currentVersion if available (from API), otherwise default to null (will prevent crash)
    // Actually, API now returns currentVersion. if null, we fallback to nothing.
    const displayedVersion = outputData?.currentVersion || outputData?.latestVersion;

    return (
        <div className="space-y-6">
            {/* Error message */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Job status */}
            {getJobStatusUI()}

            {/* Action buttons */}
            {!isEditing ? (
                <div className="flex flex-wrap gap-3">
                    {/* Generate button */}
                    <button
                        onClick={() => enqueueJob(false)}
                        disabled={!canGenerate || isLoading || inCooldown || jobStatus === "PROCESSING" || jobStatus === "QUEUED"}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg font-medium transition-colors"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Play className="w-4 h-4" />
                        )}
                        {isLoading ? "Generando..." : "Generar"}
                    </button>

                    {/* Regenerate button */}
                    <button
                        onClick={() => enqueueJob(false)}
                        disabled={!canRegenerate || isLoading || inCooldown || jobStatus === "PROCESSING" || jobStatus === "QUEUED"}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg font-medium transition-colors"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                        {isLoading ? "Regenerando..." : "Regenerar"}
                    </button>

                    {/* Edit button */}
                    {displayedVersion && (
                        <button
                            onClick={() => {
                                setIsEditing(true);
                                setSeedText(renderContent(displayedVersion.content));
                            }}
                            disabled={isLoading}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                        >
                            <Pencil className="w-4 h-4" />
                            Editar
                        </button>
                    )}

                    {/* Approve button */}
                    <button
                        onClick={approveStage}
                        disabled={!canApprove || isLoading}
                        title={!canApprove ? "Solo se puede aprobar después de generar" : ""}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg font-medium transition-colors"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <CheckCircle className="w-4 h-4" />
                        )}
                        Aprobar
                    </button>
                </div>
            ) : (
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => enqueueJob(true)}
                        disabled={isLoading || inCooldown || !seedText.trim()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg font-medium transition-colors"
                    >
                        <Sparkles className="w-4 h-4" />
                        Regenerar desde borrador
                    </button>
                    <button
                        onClick={saveManualVersion}
                        disabled={isLoading || !seedText.trim()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg font-medium transition-colors"
                    >
                        <Save className="w-4 h-4" />
                        Guardar cambios
                    </button>
                    <button
                        onClick={() => setIsEditing(false)}
                        disabled={isLoading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                    >
                        <X className="w-4 h-4" />
                        Cancelar
                    </button>
                </div>
            )
            }

            {/* Status hints */}
            <div className="text-xs text-slate-500">
                {status === "NOT_STARTED" && "Haz clic en Generar para iniciar esta etapa."}
                {status === "GENERATED" && "Puedes aprobar o regenerar el contenido."}
                {status === "APPROVED" && "Esta etapa está aprobada. Puedes regenerar si necesitas cambios."}
                {status === "REGENERATED" && "Contenido regenerado. Revisa y aprueba cuando esté listo."}
                {status === "BLOCKED" && "Esta etapa está bloqueada. Completa las etapas anteriores primero."}
            </div>

            {/* Output Content Section */}
            {
                isLoadingOutput && (
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Cargando contenido...
                    </div>
                )
            }

            {
                displayedVersion && (
                    <div className="space-y-4">
                        {/* Latest Version Content */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-purple-400" />
                                    <span className="text-sm font-medium text-white">
                                        Versión {displayedVersion.version}
                                    </span>
                                    {selectedVersion && (
                                        <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 text-xs rounded border border-yellow-500/20">
                                            Histórico
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-400">
                                    {selectedVersion && (
                                        <button
                                            onClick={handleBackToLatest}
                                            className="text-blue-400 hover:text-blue-300 hover:underline mr-2"
                                        >
                                            Volver a la última versión
                                        </button>
                                    )}
                                    <div className="group relative">
                                        <span className="bg-slate-700 px-2 py-0.5 rounded flex items-center gap-1.5 cursor-help">
                                            {displayedVersion.provider === "OPENAI" && "🤖"}
                                            {displayedVersion.provider === "ANTHROPIC" && "🔮"}
                                            {displayedVersion.model || "default"}
                                            {displayedVersion.runInfo?.preset && (
                                                <>
                                                    <span className="text-slate-500">•</span>
                                                    <span className={
                                                        displayedVersion.runInfo.preset === "quality" ? "text-purple-400" :
                                                            displayedVersion.runInfo.preset === "balanced" ? "text-blue-400" :
                                                                displayedVersion.runInfo.preset === "fast" ? "text-yellow-400" : "text-slate-400"
                                                    }>
                                                        {displayedVersion.runInfo.preset.charAt(0).toUpperCase() + displayedVersion.runInfo.preset.slice(1)}
                                                    </span>
                                                </>
                                            )}
                                        </span>
                                        {displayedVersion.runInfo && (
                                            <div className="absolute top-full right-0 mt-2 w-48 p-3 bg-slate-900 border border-slate-700 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                                <div className="text-xs font-medium text-slate-300 mb-2 border-b border-slate-800 pb-1">
                                                    Token Usage
                                                </div>
                                                <div className="space-y-1 text-xs">
                                                    <div className="flex justify-between text-slate-500">
                                                        <span>Input:</span>
                                                        <span className="font-mono">{displayedVersion.runInfo.inputTokens.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between text-slate-500">
                                                        <span>Output:</span>
                                                        <span className="font-mono">{displayedVersion.runInfo.outputTokens.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between text-slate-300 font-medium pt-1 border-t border-slate-800 mt-1">
                                                        <span>Total:</span>
                                                        <span className="font-mono text-emerald-400">{displayedVersion.runInfo.totalTokens.toLocaleString()}</span>
                                                    </div>
                                                    {(displayedVersion.runInfo.multiplier || 1) > 1 && (
                                                        <div className="flex justify-between text-yellow-500 font-medium pt-1 border-t border-slate-800 mt-1">
                                                            <span>Factor:</span>
                                                            <span>{displayedVersion.runInfo.multiplier}x ({displayedVersion.runInfo.billedTokens?.toLocaleString()} billed)</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <span>{formatDate(displayedVersion.createdAt)}</span>
                                </div>
                            </div>
                            <div className="bg-slate-900 rounded-lg p-4 bg-slate-900 overflow-hidden">
                                {isEditing ? (
                                    <textarea
                                        value={seedText}
                                        onChange={(e) => setSeedText(e.target.value)}
                                        className="w-full h-96 bg-slate-800 text-slate-200 p-4 rounded-lg border border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-y"
                                        placeholder="Edita el contenido aquí para guiar la regeneración..."
                                    />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
                                            {renderContent(displayedVersion.content)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Version History */}
                        {outputData && outputData.versions.length > 0 && (
                            <div className="border-t border-slate-800 pt-4">
                                <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    Historial de versiones
                                </h4>
                                <div className="space-y-2">
                                    {outputData.versions.map((v) => {
                                        const isCurrent = displayedVersion?.id === v.id;
                                        const hasMetadata = v.runInfo;
                                        const presetLabel = hasMetadata?.preset ? hasMetadata.preset.charAt(0).toUpperCase() + hasMetadata.preset.slice(1) : "";

                                        return (
                                            <button
                                                key={v.id}
                                                onClick={() => handleVersionClick(v.version)}
                                                className={`w-full flex items-center justify-between p-3 rounded-lg text-sm transition-colors text-left ${isCurrent
                                                    ? "bg-slate-700/50 border border-slate-600"
                                                    : "bg-slate-800/30 hover:bg-slate-800 border border-transparent"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className={`font-medium ${isCurrent ? "text-white" : "text-slate-300"}`}>
                                                        v{v.version}
                                                    </span>

                                                    {/* Metadata with Tooltip */}
                                                    <div className="group relative">
                                                        <span className="text-slate-400 text-xs flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900/50 border border-slate-700/50">
                                                            {v.provider === "OPENAI" && "🤖"}
                                                            {v.provider === "ANTHROPIC" && "🔮"}
                                                            {v.model || "Manual"}
                                                            {presetLabel && <span className="text-slate-600">•</span>}
                                                            {presetLabel && <span className={
                                                                hasMetadata?.preset === "quality" ? "text-purple-400" :
                                                                    hasMetadata?.preset === "balanced" ? "text-blue-400" :
                                                                        hasMetadata?.preset === "fast" ? "text-yellow-400" : "text-slate-400"
                                                            }>{presetLabel}</span>}
                                                        </span>

                                                        {/* Tooltip Content */}
                                                        {hasMetadata && (
                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-slate-900 border border-slate-700 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                                                <div className="text-xs font-medium text-slate-300 mb-2 border-b border-slate-800 pb-1">
                                                                    Token Usage
                                                                </div>
                                                                <div className="space-y-1 text-xs">
                                                                    <div className="flex justify-between text-slate-500">
                                                                        <span>Input:</span>
                                                                        <span className="font-mono">{hasMetadata.inputTokens.toLocaleString()}</span>
                                                                    </div>
                                                                    <div className="flex justify-between text-slate-500">
                                                                        <span>Output:</span>
                                                                        <span className="font-mono">{hasMetadata.outputTokens.toLocaleString()}</span>
                                                                    </div>
                                                                    <div className="flex justify-between text-slate-300 font-medium pt-1 border-t border-slate-800 mt-1">
                                                                        <span>Total:</span>
                                                                        <span className="font-mono text-emerald-400">{hasMetadata.totalTokens.toLocaleString()}</span>
                                                                    </div>
                                                                    {(hasMetadata.multiplier || 1) > 1 && (
                                                                        <div className="flex justify-between text-yellow-500 font-medium pt-1 border-t border-slate-800 mt-1">
                                                                            <span>Factor:</span>
                                                                            <span>{hasMetadata.multiplier}x</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-r border-b border-slate-700 rotate-45"></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="text-slate-500 text-xs">
                                                    {formatDate(v.createdAt)}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )
            }
        </div>
    );
}
