"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Play, RefreshCw, CheckCircle, Loader2, AlertCircle } from "lucide-react";

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

    const canGenerate = status === "NOT_STARTED";
    const canRegenerate = status === "GENERATED" || status === "APPROVED" || status === "REGENERATED";
    const canApprove = status === "GENERATED" || status === "REGENERATED";

    // Anti-spam cooldown (900ms minimum between clicks)
    const COOLDOWN_MS = 900;
    const [cooldownUntil, setCooldownUntil] = useState(0);
    const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (cooldownTimerRef.current) {
                clearTimeout(cooldownTimerRef.current);
            }
        };
    }, []);

    // Deterministic: in cooldown if value > 0
    const inCooldown = cooldownUntil > 0;

    const enqueueJob = async (type: "GENERATE_OUTPUT" | "REGENERATE_OUTPUT") => {
        // Guard: prevent double-click and cooldown
        if (isLoading || inCooldown) return;

        setIsLoading(true);
        setError(null);

        // Validate projectId is present (before cooldown so error doesn't trigger cooldown)
        if (!projectId) {
            setError("Error: projectId no disponible");
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

        console.log("[StageActions] Enqueuing job:", { type, projectId, stageId, stageKey, module });

        try {
            const response = await fetch("/api/jobs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type,
                    projectId,
                    module,
                    stage: stageKey,
                    payload: { stageId },
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Error encolando job");
            }

            const data = await response.json();
            setJobId(data.jobId);
            setJobStatus(data.status || "QUEUED");

            // Handle based on returned status
            if (data.status === "DONE") {
                // DEV mode: job already completed, refresh directly
                router.refresh();
            } else if (data.status === "FAILED") {
                // Job failed immediately
                setError(data.error || "El job falló durante el procesamiento");
            } else {
                // PROD mode: start polling
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

    return (
        <div className="space-y-4">
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
                    onClick={() => enqueueJob("GENERATE_OUTPUT")}
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
                    onClick={() => enqueueJob("REGENERATE_OUTPUT")}
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
        </div>
    );
}
