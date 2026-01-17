"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type SnapshotSummary = {
    id: string;
    version: number;
    createdAt: string;
    updatedAt: string;
};

type SnapshotDetail = {
    id: string;
    version: number;
    data: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
};

type DocumentSection = {
    key: string;
    title: string;
    content: Record<string, unknown>;
};

type DocumentView = {
    businessPlanId: string;
    projectId: string;
    ventureSnapshotId: string;
    snapshotVersion: number;
    updatedAt: string;
    sections: DocumentSection[];
};

type BusinessPlanPageClientProps = {
    projectId: string;
};

export function BusinessPlanPageClient({ projectId }: BusinessPlanPageClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
    const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
    const [businessPlanId, setBusinessPlanId] = useState<string | null>(null);
    const [documentView, setDocumentView] = useState<DocumentView | null>(null);
    const [seedTemplate, setSeedTemplate] = useState(true);
    const [loading, setLoading] = useState(false);
    const [loadingSnapshots, setLoadingSnapshots] = useState(false);
    const [loadingDocument, setLoadingDocument] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [infoMessage, setInfoMessage] = useState<string | null>(null);
    const [jobId, setJobId] = useState<string | null>(null);
    const [jobStatus, setJobStatus] = useState<string | null>(null);
    const [jobProgress, setJobProgress] = useState<number | null>(null);

    const getFriendlyError = useCallback((status: number | null) => {
        if (status === 401 || status === 403) {
            return "Necesitás iniciar sesión / no tenés permisos";
        }
        if (status === 404) {
            return "No encontrado";
        }
        if (status === 409) {
            return "Conflicto: ya existe";
        }
        return "Ocurrió un error";
    }, []);

    const loadSnapshots = useCallback(async () => {
        setError(null);
        setLoadingSnapshots(true);
        const res = await fetch(`/api/projects/${projectId}/venture-snapshots`, {
            credentials: "include",
        });
        if (!res.ok) {
            console.error("Snapshots error:", res.status);
            throw new Error(getFriendlyError(res.status));
        }
        const data = await res.json();
        setSnapshots(data.snapshots ?? []);
        setLoadingSnapshots(false);
    }, [projectId, getFriendlyError]);

    const loadSnapshotVersion = useCallback(
        async (version: number) => {
            setError(null);
            setInfoMessage(null);
            const res = await fetch(
                `/api/projects/${projectId}/venture-snapshots/${version}`,
                { credentials: "include" }
            );
            if (!res.ok) {
                console.error("Snapshot error:", res.status);
                throw new Error(getFriendlyError(res.status));
            }
            const data = await res.json();
            setBusinessPlanId(data.businessPlanId ?? null);
            return data.snapshot as SnapshotDetail;
        },
        [projectId, getFriendlyError]
    );

    const loadDocument = useCallback(async (planId: string) => {
        setError(null);
        const res = await fetch(`/api/business-plans/${planId}/document`, {
            credentials: "include",
        });
        if (!res.ok) {
            console.error("Document error:", res.status);
            throw new Error(getFriendlyError(res.status));
        }
        const data = await res.json();
        setDocumentView(data);
    }, [getFriendlyError]);

    const handleSelectVersion = useCallback(
        async (version: number, updateUrl = true) => {
            setLoading(true);
            setLoadingDocument(true);
            setDocumentView(null);
            try {
                await loadSnapshotVersion(version);
                setSelectedVersion(version);
                if (updateUrl) {
                    router.replace(`?version=${version}`);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Ocurrió un error");
            } finally {
                setLoading(false);
                setLoadingDocument(false);
            }
        },
        [loadSnapshotVersion, router]
    );

    const handleCreateSnapshot = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/projects/${projectId}/venture-snapshots`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ seedTemplate }),
                credentials: "include",
            });
            if (!res.ok) {
                console.error("Create snapshot error:", res.status);
                throw new Error(getFriendlyError(res.status));
            }
            const data = await res.json();
            const version = data.snapshot?.version ?? null;
            await loadSnapshots();
            if (version) {
                await handleSelectVersion(version);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Ocurrió un error");
        } finally {
            setLoading(false);
        }
    }, [projectId, seedTemplate, loadSnapshots, handleSelectVersion, getFriendlyError]);

    const handleGenerate = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(
                `/api/projects/${projectId}/business-plan/generate`,
                {
                    method: "POST",
                    credentials: "include",
                }
            );
            if (!res.ok) {
                console.error("Generate job error:", res.status);
                throw new Error(getFriendlyError(res.status));
            }
            const data = await res.json();
            setJobId(data.jobId ?? null);
            setJobStatus("QUEUED");
            setJobProgress(0);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Ocurrió un error");
        } finally {
            setLoading(false);
        }
    }, [projectId, getFriendlyError]);

    useEffect(() => {
        setLoading(true);
        loadSnapshots()
            .then(() => {
                setLoading(false);
            })
            .catch((err) => {
                setLoading(false);
                setError(err instanceof Error ? err.message : "Ocurrió un error");
            });
    }, [loadSnapshots]);

    useEffect(() => {
        if (!snapshots.length) {
            setSelectedVersion(null);
            return;
        }
        const paramVersion = searchParams.get("version");
        const parsed = paramVersion ? Number(paramVersion) : null;
        if (parsed && Number.isInteger(parsed)) {
            const exists = snapshots.some((snapshot) => snapshot.version === parsed);
            if (exists) {
                handleSelectVersion(parsed, false);
                return;
            }
            setInfoMessage("Versión no encontrada, mostrando la más reciente.");
        }
        const latest = [...snapshots].sort((a, b) => b.version - a.version)[0];
        if (latest) {
            handleSelectVersion(latest.version, false);
        }
    }, [snapshots, searchParams, handleSelectVersion]);

    useEffect(() => {
        if (!businessPlanId) {
            setDocumentView(null);
            return;
        }
        setLoading(true);
        setLoadingDocument(true);
        loadDocument(businessPlanId)
            .catch((err) => {
                setError(err instanceof Error ? err.message : "Ocurrió un error");
            })
            .finally(() => {
                setLoading(false);
                setLoadingDocument(false);
            });
    }, [businessPlanId, loadDocument]);

    useEffect(() => {
        if (!jobId) return;
        let cancelled = false;
        const poll = async () => {
            try {
                const res = await fetch(
                    `/api/projects/${projectId}/business-plan/generate/status?jobId=${jobId}`,
                    { credentials: "include" }
                );
                if (!res.ok) {
                    console.error("Job status error:", res.status);
                    throw new Error(getFriendlyError(res.status));
                }
                const data = await res.json();
                if (cancelled) return;
                setJobStatus(data.status ?? null);
                setJobProgress(data.progress ?? null);
                if (data.status === "DONE") {
                    setJobId(null);
                    setJobStatus(null);
                    setJobProgress(null);
                    await loadSnapshots();
                    if (data.latestSnapshotVersion) {
                        await handleSelectVersion(data.latestSnapshotVersion);
                    }
                }
                if (data.status === "FAILED") {
                    setError(data.message || "Ocurrió un error");
                    setJobId(null);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : "Ocurrió un error");
                    setJobId(null);
                }
            }
        };
        const interval = setInterval(poll, 3000);
        poll();
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [jobId, projectId, getFriendlyError, loadSnapshots, handleSelectVersion]);

    const snapshotOptions = useMemo(
        () =>
            snapshots.map((snapshot) => ({
                value: snapshot.version,
                label: `v${snapshot.version} · ${new Date(snapshot.createdAt).toLocaleDateString()}`,
            })),
        [snapshots]
    );

    const exportLinks = businessPlanId
        ? {
              pdf: `/api/business-plans/${businessPlanId}/export/pdf`,
              docx: `/api/business-plans/${businessPlanId}/export/docx`,
          }
        : null;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-white">Business Plan</h1>
                    <p className="text-sm text-slate-400">
                        Versiones y documento del plan
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                        <input
                            type="checkbox"
                            checked={seedTemplate}
                            onChange={(event) => setSeedTemplate(event.target.checked)}
                            className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-amber-500"
                        />
                        Seed template sections
                    </label>
                    <button
                        onClick={handleCreateSnapshot}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-900 disabled:opacity-60"
                    >
                        Crear snapshot
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={loading || jobStatus === "PROCESSING" || jobStatus === "QUEUED"}
                        className="inline-flex items-center gap-2 rounded border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-60"
                    >
                        Generar
                    </button>
                </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                    <label className="text-xs text-slate-400">Version</label>
                    <select
                        value={selectedVersion ?? ""}
                        onChange={(event) => handleSelectVersion(Number(event.target.value))}
                        className="rounded border border-slate-700 bg-slate-950 px-3 py-1 text-sm text-slate-200"
                    >
                        <option value="" disabled>
                            Seleccionar version
                        </option>
                        {snapshotOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    {exportLinks && (
                        <div className="flex items-center gap-2">
                            <a
                                href={exportLinks.pdf}
                                className="inline-flex items-center rounded bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                            >
                                Download PDF
                            </a>
                            <a
                                href={exportLinks.docx}
                                className="inline-flex items-center rounded bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                            >
                                Download DOCX
                            </a>
                        </div>
                    )}
                </div>
                {loadingSnapshots && (
                    <p className="text-xs text-slate-400">Cargando snapshots...</p>
                )}
                {loadingDocument && (
                    <p className="text-xs text-slate-400">Cargando documento...</p>
                )}
                {jobStatus && (
                    <p className="text-xs text-amber-300">
                        Generando... {jobProgress ?? 0}%
                    </p>
                )}
                {infoMessage && <p className="text-xs text-amber-300">{infoMessage}</p>}
                {error && <p className="text-xs text-red-400">{error}</p>}
            </div>

            {!snapshots.length && !loadingSnapshots && (
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center">
                    <h2 className="text-lg font-semibold text-white">Sin snapshots</h2>
                    <p className="mt-2 text-sm text-slate-400">
                        Crea el primer snapshot para comenzar el Business Plan.
                    </p>
                    <button
                        onClick={handleCreateSnapshot}
                        disabled={loading}
                        className="mt-4 inline-flex items-center gap-2 rounded bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-900 disabled:opacity-60"
                    >
                        Crear primer snapshot
                    </button>
                </div>
            )}

            {documentView && (
                <div className="space-y-4">
                    {documentView.sections.map((section) => {
                        const rawContent = section.content ?? {};
                        const textContent =
                            typeof rawContent.markdown === "string"
                                ? rawContent.markdown
                                : typeof rawContent.text === "string"
                                ? rawContent.text
                                : null;
                        const displayContent = textContent ?? JSON.stringify(rawContent, null, 2);

                        return (
                            <details
                                key={section.key}
                                className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3"
                                open
                            >
                                <summary className="cursor-pointer text-sm font-semibold text-white">
                                    {section.title || section.key}
                                </summary>
                                <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-300">
                                    {displayContent}
                                </pre>
                            </details>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
