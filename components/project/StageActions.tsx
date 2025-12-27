"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Play, RefreshCw, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { TokenLimitBanner } from "@/components/usage/TokenLimitBanner";
import { v4 as uuidv4 } from "uuid";

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
    const [error, setError] = useState<React.ReactNode | null>(null);
    const [jobId, setJobId] = useState<string | null>(initialJobId || null);
    const [jobStatus, setJobStatus] = useState<JobStatus | null>(
        (initialJobStatus as JobStatus) || null
    );

    const canGenerate = status === "NOT_STARTED";
    const canRegenerate = status === "GENERATED" || status === "APPROVED" || status === "REGENERATED";

    // Anti-spam cooldown (900ms minimum between clicks)
    const COOLDOWN_MS = 900;
    const [cooldownUntil, setCooldownUntil] = useState(0);
    const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isMountedRef = useRef(true);

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;
        // Resume polling if we have an active job on mount
        if (jobId && (jobStatus === "QUEUED" || jobStatus === "PROCESSING")) {
            pollJobStatus(jobId);
        }
        return () => {
            isMountedRef.current = false;
            if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const inCooldown = cooldownUntil > 0;

    const buyAddon = async () => {
        if (!confirm("¿Comprar 500,000 tokens adicionales? (Simulación)")) return;

        try {
            // 1. Create Intent
            const idempotencyKey = uuidv4();
            const intentRes = await fetch("/api/usage/addon/intent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idempotencyKey })
            });

            if (!intentRes.ok) {
                const err = await intentRes.json();
                throw new Error(err.error || "Failed to create intent");
            }

            const intentData = await intentRes.json();

            // 2. Confirm Intent (Simulating Stripe Webhook/Action)
            const confirmRes = await fetch("/api/usage/addon/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ intentId: intentData.intentId })
            });

            if (!confirmRes.ok) {
                const err = await confirmRes.json();
                throw new Error(err.error || "Failed to confirm purchase");
            }

            alert("Tokens añadidos correctamente. Intenta generar de nuevo.");
            setError(null);
            router.refresh();

        } catch (e: any) {
            console.error("Purchase error:", e);
            alert(`Error comprando tokens: ${e.message}`);
        }
    };

    const enqueueJob = async () => {
        // Guard: prevent double-click and cooldown
        if (isLoading || inCooldown) return;

        setIsLoading(true);
        setError(null);

        // Validate projectId is present (before cooldown so error doesn't trigger cooldown)
        if (!projectId || !stageKey) {
            // Updated to simple string here since type allows Node, but good to keep simple
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

        console.log("[StageActions] Enqueueing stage:", { projectId, stageKey });

        try {
            // Use new /run endpoint (handles idempotency server-side)
            const response = await fetch(`/api/projects/${projectId}/stages/${stageKey}/run`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    regenerate: true
                })
            });

            if (!response.ok) {
                const data = await response.json();

                // Gating: Handle 402 Token Limit
                if (response.status === 402) {
                    setError(
                        <TokenLimitBanner
                            error={data}
                            onPurchaseAddon={buyAddon}
                        />
                    );
                    setIsLoading(false);
                    return;
                    setIsLoading(false);
                    return;
                }

                if (response.status === 401) {
                    throw new Error("Authentication required");
                }
                throw new Error(data.error || "Error ejecutando etapa");
            }

            const data = await response.json();
            setJobId(data.jobId);
            setJobStatus(data.status || "QUEUED");

            // Persist Job ID in URL for refresh resilience
            const url = new URL(window.location.href);
            url.searchParams.set("jobId", data.jobId);
            window.history.replaceState({}, "", url.toString());

            // If idempotent response (job already running), continue polling
            if (data.idempotent) {
                console.log("[StageActions] Job already in progress:", data.jobId);
            }

            // Start polling regardless of status (unless failed immediately)
            if (data.status === "FAILED") {
                setError(data.error || "El job falló al iniciar");
            } else {
                pollJobStatus(data.jobId);
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : "Error desconocido");
            setJobId(null);
            setJobStatus(null);
        } finally {
            setIsLoading(false);
        }
    };

    const pollJobStatus = async (id: string) => {
        const maxAttempts = 60; // 60 seconds max timeout for UI polling
        let attempts = 0;

        const poll = async () => {
            if (!isMountedRef.current) return;

            try {
                const response = await fetch(`/api/jobs/${id}`);
                if (!response.ok) {
                    // non-critical error, maybe retry?
                    console.warn("Poll failed:", response.status);
                    return;
                }

                const data = await response.json();

                if (!isMountedRef.current) return;

                setJobStatus(data.status);

                if (data.status === "DONE") {
                    console.log("[StageActions] Job DONE", data.result);
                    router.refresh();

                    // Clear param clean
                    const url = new URL(window.location.href);
                    url.searchParams.delete("jobId");
                    window.history.replaceState({}, "", url.toString());

                    return;
                }

                if (data.status === "FAILED") {
                    setError(data.error || "El job falló durante el procesamiento");
                    const url = new URL(window.location.href);
                    url.searchParams.delete("jobId");
                    window.history.replaceState({}, "", url.toString());
                    return;
                }

                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(poll, 1500); // 1.5s interval
                } else {
                    setError("Tiempo de espera agotado. La generación continúa en segundo plano.");
                }
            } catch (err) {
                console.error("Poll error:", err);
            }
        };

        poll();
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
                text: "Generando...",
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

        // Default to PROCESSING if unknown status to be safe, or FAILED if truly unknown
        const config = statusConfig[jobStatus] || statusConfig.FAILED;
        const Icon = config.icon;

        return (
            <div className={`flex items-center gap-2 ${config.color} bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700/50`}>
                <Icon className={`w-4 h-4 ${config.animate ? "animate-spin" : ""}`} />
                <span className="text-sm font-medium">{config.text}</span>
            </div>
        );
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
                    onClick={() => enqueueJob()}
                    disabled={!canGenerate || isLoading || inCooldown || jobStatus === "PROCESSING" || jobStatus === "QUEUED"}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg font-medium transition-colors"
                >
                    {isLoading || jobStatus === "QUEUED" || jobStatus === "PROCESSING" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Play className="w-4 h-4" />
                    )}
                    {jobStatus === "QUEUED" ? "En cola..." : jobStatus === "PROCESSING" ? "Generando..." : "Generar"}
                </button>

                {/* Regenerate button */}
                <button
                    onClick={() => enqueueJob()}
                    disabled={!canRegenerate || isLoading || inCooldown || jobStatus === "PROCESSING" || jobStatus === "QUEUED"}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg font-medium transition-colors"
                >
                    {isLoading || jobStatus === "QUEUED" || jobStatus === "PROCESSING" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <RefreshCw className="w-4 h-4" />
                    )}
                    {jobStatus === "QUEUED" ? "En cola..." : jobStatus === "PROCESSING" ? "Regenerando..." : "Regenerar"}
                </button>
            </div>

            {/* Status hints */}
            <div className="text-xs text-slate-500">
                {status === "NOT_STARTED" && !jobStatus && "Haz clic en Generar para iniciar esta etapa."}
                {status === "GENERATED" && !jobStatus && "Puedes aprobar o regenerar el contenido."}
                {status === "APPROVED" && "Esta etapa está aprobada. Puedes regenerar si necesitas cambios."}
                {status === "REGENERATED" && "Contenido regenerado. Revisa y aprueba cuando esté listo."}
            </div>
        </div>
    );
}

