"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
    const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
    const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
    const [businessPlanId, setBusinessPlanId] = useState<string | null>(null);
    const [documentView, setDocumentView] = useState<DocumentView | null>(null);
    const [seedTemplate, setSeedTemplate] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadSnapshots = useCallback(async () => {
        setError(null);
        const res = await fetch(`/api/projects/${projectId}/venture-snapshots`, {
            credentials: "include",
        });
        if (!res.ok) {
            throw new Error("Error al cargar snapshots");
        }
        const data = await res.json();
        setSnapshots(data.snapshots ?? []);
    }, [projectId]);

    const loadSnapshotVersion = useCallback(
        async (version: number) => {
            setError(null);
            const res = await fetch(
                `/api/projects/${projectId}/venture-snapshots/${version}`,
                { credentials: "include" }
            );
            if (!res.ok) {
                throw new Error("Error al cargar snapshot");
            }
            const data = await res.json();
            setBusinessPlanId(data.businessPlanId ?? null);
            return data.snapshot as SnapshotDetail;
        },
        [projectId]
    );

    const loadDocument = useCallback(async (planId: string) => {
        setError(null);
        const res = await fetch(`/api/business-plans/${planId}/document`, {
            credentials: "include",
        });
        if (!res.ok) {
            throw new Error("Error al cargar documento");
        }
        const data = await res.json();
        setDocumentView(data);
    }, []);

    const handleSelectVersion = useCallback(
        async (version: number) => {
            setLoading(true);
            setDocumentView(null);
            try {
                await loadSnapshotVersion(version);
                setSelectedVersion(version);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error al cargar snapshot");
            } finally {
                setLoading(false);
            }
        },
        [loadSnapshotVersion]
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
                const msg = res.status === 409 ? "Conflicto al crear snapshot" : "Error al crear snapshot";
                throw new Error(msg);
            }
            const data = await res.json();
            const version = data.snapshot?.version ?? null;
            await loadSnapshots();
            if (version) {
                await handleSelectVersion(version);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al crear snapshot");
        } finally {
            setLoading(false);
        }
    }, [projectId, seedTemplate, loadSnapshots, handleSelectVersion]);

    useEffect(() => {
        setLoading(true);
        loadSnapshots()
            .then(() => {
                setLoading(false);
            })
            .catch((err) => {
                setLoading(false);
                setError(err instanceof Error ? err.message : "Error al cargar snapshots");
            });
    }, [loadSnapshots]);

    useEffect(() => {
        if (!businessPlanId) {
            setDocumentView(null);
            return;
        }
        setLoading(true);
        loadDocument(businessPlanId)
            .catch((err) => {
                setError(err instanceof Error ? err.message : "Error al cargar documento");
            })
            .finally(() => setLoading(false));
    }, [businessPlanId, loadDocument]);

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
                {loading && <p className="text-xs text-slate-400">Cargando...</p>}
                {error && <p className="text-xs text-red-400">{error}</p>}
            </div>

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
