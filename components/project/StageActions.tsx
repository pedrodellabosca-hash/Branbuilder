"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Play, RefreshCw, Loader2, AlertCircle, CheckCircle, Bug } from "lucide-react";
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

    // Development Debug Info
    const [lastHttpStatus, setLastHttpStatus] = useState<number | null>(null);

    const canGenerate = status === "NOT_STARTED";
    const canRegenerate = status === "GENERATED" || status === "APPROVED" || status === "REGENERATED";

    // Anti-spam cooldown (900ms minimum between clicks)
    const COOLDOWN_MS = 900;
    const [cooldownUntil, setCooldownUntil] = useState(0);
    const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isMountedRef = useRef(true);

    // Persistence Key
    const LS_KEY = `bf:job:${projectId}:${stageKey}`;

    // Auto-resume from LocalStorage
    useEffect(() => {
        isMountedRef.current = true;

        // 1. Check prop (initialJobId) first, then LocalStorage
        const storedJobId = localStorage.getItem(LS_KEY);
        if (!jobId && storedJobId) {
            console.debug("[StageActions] Resuming job from persistence:", storedJobId);
            setJobId(storedJobId);
            setJobStatus("PROCESSING"); // Assume processing if stored
            pollJobStatus(storedJobId);
        } else if (jobId && (jobStatus === "QUEUED" || jobStatus === "PROCESSING")) {
            // Resume from prop
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

        // Validate projectId
        if (!projectId || !stageKey) {
            setError("Error: projectId o stageKey no disponible");
            setIsLoading(false);
            return;
        }

        // Set cooldown
        setCooldownUntil(1);
        if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = setTimeout(() => {
            setCooldownUntil(0);
            cooldownTimerRef.current = null;
        }, COOLDOWN_MS);

        console.debug("[StageActions] Enqueueing stage:", { projectId, stageKey });

        try {
            const response = await fetch(`/api/projects/${projectId}/stages/${stageKey}/run`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ regenerate: true })
            });

            if (!response.ok) {
                const data = await response.json();
                if (response.status === 402) {
                    setError(<TokenLimitBanner error={data} onPurchaseAddon={buyAddon} />);
                    setIsLoading(false);
                    return;
                }
                if (response.status === 401) throw new Error("Authentication required");
                throw new Error(data.error || "Error ejecutando etapa");
            }

            const data = await response.json();
            const newJobId = data.jobId;

            console.debug("[StageActions] Job Started:", newJobId);
            setJobId(newJobId);
            setJobStatus(data.status || "QUEUED");

            // Persist
            localStorage.setItem(LS_KEY, newJobId);

            // URL Param
            const url = new URL(window.location.href);
            url.searchParams.set("jobId", newJobId);
            window.history.replaceState({}, "", url.toString());

            // Check Idempotency
            if (data.idempotent) {
                console.warn("[StageActions] Job already in progress (idempotent):", newJobId);
            }

            if (data.status === "FAILED") {
                handleJobFailed(data.error || "El job falló al iniciar");
            } else {
                pollJobStatus(newJobId, true); // Pass true to indicate fresh start
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : "Error desconocido");
            setJobId(null);
            setJobStatus(null);
        } finally {
            setIsLoading(false);
        }
    };

    // Helper to handle completion
    const handleJobDone = (result: any) => {
        console.debug("[StageActions] handleJobDone triggered");
        setJobStatus("DONE");
        setIsLoading(false);
        localStorage.removeItem(LS_KEY); // Clear persistence

        // Cleanup URL
        const url = new URL(window.location.href);
        url.searchParams.delete("jobId");
        window.history.replaceState({}, "", url.toString());

        // Refresh Data
        router.refresh();
    };

    // Helper to handle failure
    const handleJobFailed = (msg: string) => {
        console.debug("[StageActions] handleJobFailed triggered:", msg);
        setJobStatus("FAILED");
        setError(msg);
        setIsLoading(false);
        localStorage.removeItem(LS_KEY);

        const url = new URL(window.location.href);
        url.searchParams.delete("jobId");
        window.history.replaceState({}, "", url.toString());
    };


    const pollJobStatus = async (id: string, isFresh = false) => {
        const maxAttempts = 90;
        let attempts = 0;
        let initialVersionId: string | null = null; // for dual-confirmation

        // Get initial latest version ID to detect changes
        if (isFresh) {
            try {
                const res = await fetch(`/api/projects/${projectId}/stages/${stageKey}/output`, { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    initialVersionId = data.latestVersion?.id || null;
                    console.debug("[StageActions] Initial Version ID:", initialVersionId);
                }
            } catch (e) { /* ignore */ }
        }

        const poll = async () => {
            if (!isMountedRef.current) return;

            // 1. Fetch Job Status (Project Scoped)
            try {
                const jobRes = await fetch(`/api/projects/${projectId}/jobs/${id}`, {
                    cache: 'no-store',
                    headers: { 'Cache-Control': 'no-cache' }
                });

                setLastHttpStatus(jobRes.status);

                if (jobRes.status === 401) {
                    handleJobFailed("Sesión expirada. Por favor recarga la página.");
                    return;
                }

                if (jobRes.ok) {
                    const data = await jobRes.json();
                    if (!isMountedRef.current) return;

                    console.debug(`[StageActions] Poll Job ${id}: ${data.status}`);
                    setJobStatus(data.status);

                    if (data.status === "DONE") {
                        handleJobDone(data.result);
                        return;
                    }
                    if (data.status === "FAILED") {
                        handleJobFailed(data.error || "El job falló");
                        return;
                    }
                } else {
                    console.warn(`[StageActions] Poll Job Error: ${jobRes.status}`);
                }
            } catch (err) {
                console.error("[StageActions] Poll Network Error:", err);
            }

            // 2. Dual-Check: Verify if output version changed via API
            try {
                const outRes = await fetch(`/api/projects/${projectId}/stages/${stageKey}/output`, {
                    cache: 'no-store'
                });
                if (outRes.ok) {
                    const outData = await outRes.json();
                    const currentLatestId = outData.latestVersion?.id;

                    // If we have a new version compared to what we started with (or just a valid latest version if we didn't track start)
                    // Note: Ideally we compare timestamps or IDs. 
                    // If isFresh=true and initialVersionId is set, checking change is safe.
                    // If resuming, initialVersionId is null, so simply having a version created *after* job start would be ideal.
                    // For now, if status is NOT done but we see a version created very recently, we could infer.
                    // But simpler: if Job logic above failed (network/auth) but Output exists, maybe we are done?
                    // Let's stick to: if Job says DONE (handled above).
                    // If Job is stuck but output appears? 
                    if (initialVersionId && currentLatestId && currentLatestId !== initialVersionId) {
                        console.debug("[StageActions] Dual-Check: New version detected!", currentLatestId);
                        handleJobDone({}); // Infer done
                        return;
                    }
                }
            } catch (e) { /* ignore */ }

            attempts++;
            if (attempts >= maxAttempts) {
                setError("El proceso está tardando más de lo esperado. Puedes recargar la página.");
                setIsLoading(false);
                // Don't clear LocalStorage so user can refresh and try poll again if they want, 
                // or maybe we should to avoid infinite loop. Let's clear loading state but keep ID.
                return;
            }

            setTimeout(poll, 1500);
        };

        poll();
    };

    const getJobStatusUI = () => {
        if (!jobId || !jobStatus) return null;

        const statusConfig = {
            QUEUED: { icon: Loader2, text: "En cola...", color: "text-yellow-400", animate: true },
            PROCESSING: { icon: Loader2, text: "Generando...", color: "text-blue-400", animate: true },
            DONE: { icon: CheckCircle, text: "Completado", color: "text-green-400", animate: false },
            FAILED: { icon: AlertCircle, text: "Error", color: "text-red-400", animate: false },
        };

        const config = statusConfig[jobStatus] || statusConfig.FAILED;
        const Icon = config.icon;

        return (
            <div className={`flex flex-col gap-1`}>
                <div className={`flex items-center gap-2 ${config.color} bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700/50`}>
                    <Icon className={`w-4 h-4 ${config.animate ? "animate-spin" : ""}`} />
                    <span className="text-sm font-medium">{config.text}</span>
                </div>
                {/* Dev Debug Info - Hidden in Prod ideally, but showing for QA context */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="text-[10px] text-slate-600 font-mono pl-1">
                        Job: {jobId?.slice(0, 8)}... | Status: {jobStatus} | HTTP: {lastHttpStatus}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {getJobStatusUI()}

            <div className="flex flex-wrap gap-3">
                <button
                    onClick={() => enqueueJob()}
                    disabled={!canGenerate || isLoading || inCooldown || jobStatus === "PROCESSING" || jobStatus === "QUEUED"}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg font-medium transition-colors"
                >
                    {isLoading || ["QUEUED", "PROCESSING"].includes(jobStatus || "") ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Play className="w-4 h-4" />
                    )}
                    {jobStatus === "QUEUED" ? "En cola..." : jobStatus === "PROCESSING" ? "Generando..." : "Generar"}
                </button>

                <button
                    onClick={() => enqueueJob()}
                    disabled={!canRegenerate || isLoading || inCooldown || jobStatus === "PROCESSING" || jobStatus === "QUEUED"}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg font-medium transition-colors"
                >
                    {isLoading || ["QUEUED", "PROCESSING"].includes(jobStatus || "") ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <RefreshCw className="w-4 h-4" />
                    )}
                    {jobStatus === "QUEUED" ? "En cola..." : jobStatus === "PROCESSING" ? "Regenerando..." : "Regenerar"}
                </button>
            </div>

            <div className="text-xs text-slate-500">
                {status === "NOT_STARTED" && !jobStatus && "Haz clic en Generar para iniciar esta etapa."}
                {status === "GENERATED" && !jobStatus && "Puedes aprobar o regenerar el contenido."}
                {status === "APPROVED" && "Esta etapa está aprobada. Puedes regenerar si necesitas cambios."}
                {status === "REGENERATED" && "Contenido regenerado. Revisa y aprueba cuando esté listo."}
            </div>
        </div>
    );
}
