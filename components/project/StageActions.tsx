"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Play, RefreshCw, CheckCircle, Loader2, AlertCircle, Clock, Sparkles } from "lucide-react";

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
}

interface OutputData {
    stage: { id: string; stageKey: string; name: string; status: string } | null;
    output: { id: string; name: string; outputKey: string } | null;
    versions: OutputVersion[];
    latestVersion: OutputVersion | null;
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

    const canGenerate = status === "NOT_STARTED";
    const canRegenerate = status === "GENERATED" || status === "APPROVED" || status === "REGENERATED";
    const canApprove = status === "GENERATED" || status === "REGENERATED";

    // Anti-spam cooldown (900ms minimum between clicks)
    const COOLDOWN_MS = 900;
    const [cooldownUntil, setCooldownUntil] = useState(0);
    const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const isMountedRef = useRef(true);

    // Fetch output data from /output endpoint with abort support
    const fetchOutput = useCallback(async () => {
        if (!projectId || !stageKey) return;

        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setIsLoadingOutput(true);
        try {
            const response = await fetch(`/api/projects/${projectId}/stages/${stageKey}/output`, {
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

    const enqueueJob = async () => {
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

        console.log("[StageActions] Running stage:", { projectId, stageKey });

        try {
            // Use new /run endpoint (handles idempotency server-side)
            const response = await fetch(`/api/projects/${projectId}/stages/${stageKey}/run`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) {
                const data = await response.json();
                if (response.status === 401) {
                    throw new Error("Authentication required");
                }
                throw new Error(data.error || "Error ejecutando etapa");
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
            const response = await fetch(`/api/projects/${projectId}/stages/${stageId}/approve`, {
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

        const config = statusConfig[jobStatus];
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
            <div className="flex flex-wrap gap-3">
                {/* Generate button */}
                <button
                    onClick={enqueueJob}
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
                    onClick={enqueueJob}
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

            {/* Status hints */}
            <div className="text-xs text-slate-500">
                {status === "NOT_STARTED" && "Haz clic en Generar para iniciar esta etapa."}
                {status === "GENERATED" && "Puedes aprobar o regenerar el contenido."}
                {status === "APPROVED" && "Esta etapa está aprobada. Puedes regenerar si necesitas cambios."}
                {status === "REGENERATED" && "Contenido regenerado. Revisa y aprueba cuando esté listo."}
                {status === "BLOCKED" && "Esta etapa está bloqueada. Completa las etapas anteriores primero."}
            </div>

            {/* Output Content Section */}
            {isLoadingOutput && (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cargando contenido...
                </div>
            )}

            {outputData?.latestVersion && (
                <div className="space-y-4">
                    {/* Latest Version Content */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-purple-400" />
                                <span className="text-sm font-medium text-white">
                                    Versión {outputData.latestVersion.version}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-400">
                                {outputData.latestVersion.provider && (
                                    <span className="bg-slate-700 px-2 py-0.5 rounded">
                                        {outputData.latestVersion.provider}/{outputData.latestVersion.model || "default"}
                                    </span>
                                )}
                                <span>{formatDate(outputData.latestVersion.createdAt)}</span>
                            </div>
                        </div>
                        <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                            <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
                                {renderContent(outputData.latestVersion.content)}
                            </pre>
                        </div>
                    </div>

                    {/* Version History */}
                    {outputData.versions.length > 1 && (
                        <div className="border-t border-slate-800 pt-4">
                            <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Historial de versiones ({outputData.versions.length})
                            </h4>
                            <div className="space-y-2">
                                {outputData.versions.slice(1).map((v) => (
                                    <div
                                        key={v.id}
                                        className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg text-sm"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-white font-medium">v{v.version}</span>
                                            <span className="text-slate-400 text-xs">
                                                {v.provider || "manual"}/{v.model || "-"}
                                            </span>
                                        </div>
                                        <span className="text-slate-500 text-xs">
                                            {formatDate(v.createdAt)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
