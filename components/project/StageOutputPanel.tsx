
"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, AlertCircle, Clock, Sparkles, Pencil, X, Save, AlertTriangle, Image as ImageIcon, FileText } from "lucide-react";
import { useRouter } from "next/navigation";

// Types extracted/shared
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
        validated?: boolean;
        validationError?: string | null;
        fallbackWarning?: string | null;
    };
}

interface OutputData {
    stage: { id: string; stageKey: string; name: string; status: string } | null;
    output: { id: string; name: string; outputKey: string } | null;
    versions: OutputVersion[];
    latestVersion: OutputVersion | null;
    currentVersion?: OutputVersion | null;
}

interface StageOutputPanelProps {
    projectId: string;
    stageKey: string;
    // Optional callbacks if parent needs to know things
    onStatusChange?: () => void;
}

export function StageOutputPanel({ projectId, stageKey, onStatusChange }: StageOutputPanelProps) {
    const router = useRouter();
    const [outputData, setOutputData] = useState<OutputData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Editing State
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState("");
    const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

    const isMountedRef = useRef(true);

    const fetchOutput = async (version?: number) => {
        setIsLoading(true);
        setError(null);
        try {
            const url = version
                ? `/api/projects/${projectId}/stages/${stageKey}/output?version=${version}`
                : `/api/projects/${projectId}/stages/${stageKey}/output`;

            const res = await fetch(url);
            if (!res.ok) throw new Error("Error fetching output");
            const data: OutputData = await res.json();

            if (isMountedRef.current) {
                setOutputData(data);
                setSelectedVersion(version || null);
            }
        } catch (err) {
            console.error("Fetch output error:", err);
            // Don't show hard error UI for initial fetch fail, likely just no output yet
        } finally {
            if (isMountedRef.current) setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOutput();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId, stageKey]); // Refetch on mount or key change

    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    // Listen to refresh events if needed (maybe exposing a ref or using context later)
    // For now, parent might trigger route refresh or we poll. 
    // Actually StageActions triggers route refresh on generate, so we should react to that not strictly but we fetch on mount.
    // Ideally we should export fetchOutput or have a prop trigger.
    // A simpler way: use polling or SWR. For now, we fetch on mount.
    // BUT if StageActions actions happen, we want to update.
    // We can rely on router.refresh() causing component re-render? No, client component state persists.
    // We need a mechanism to refresh. 
    // Let's assume parent passes a key to force refresh or we poll.
    // Actually, StagePage uses dynamic rendering. `router.refresh()` in StageActions will re-fetch data in Page props,
    // but CLIENT component `StageOutputPanel` fetches its own data.
    // Solution: Add a specialized polling or just re-fetch on focus?
    // Let's stick to fetch on mount. 
    // Wait, if user clicks Generate in sibling component, this one won't update?
    // We need shared state or event. 
    // Minimal fix: Just poll output every 5s if output exists?
    // Or expose a refresh handle. 
    // Given the constraints, I will add a simple poll for "latest version" check every 5s if not editing.
    // And simpler: StageActions calls `router.refresh()`. Does that re-mount? No.
    // I will add a version/job completion listener integration later, for now we assume manual refresh or basic polling.
    // Actually, I can just poll quietly every 3s.

    useEffect(() => {
        const interval = setInterval(() => {
            if (!isEditing && !isSaving && !isLoading) {
                // Silent background refresh
                fetchOutput(selectedVersion || undefined).catch(() => { });
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [isEditing, isSaving, isLoading, selectedVersion, projectId, stageKey]);


    const handleSaveManual = async () => {
        if (!displayedVersion) return;
        setIsSaving(true);
        try {
            // Try parse JSON if original was object
            let contentToSave: any = editContent;
            if (typeof displayedVersion.content === 'object') {
                try {
                    contentToSave = JSON.parse(editContent);
                } catch (e) {
                    throw new Error("Invalid JSON format");
                }
            }

            const res = await fetch(`/api/projects/${projectId}/stages/${stageKey}/output/version`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: contentToSave,
                    baseVersionId: displayedVersion.id
                })
            });
            if (!res.ok) throw new Error("Error saving version");

            await fetchOutput();
            setIsEditing(false);
            if (onStatusChange) onStatusChange();
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleApprove = async () => {
        if (!displayedVersion) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/stages/${stageKey}/approve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ versionId: displayedVersion.id })
            });
            if (!res.ok) throw new Error("Error approving version");

            await fetchOutput(selectedVersion || undefined);
            if (onStatusChange) onStatusChange();
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("es", {
            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
        });
    };

    const displayedVersion = outputData?.currentVersion || outputData?.latestVersion;

    const renderContentPreview = () => {
        if (!displayedVersion) return null;

        // Handle File URL (naive check)
        const c = displayedVersion.content as any;
        if (c?.fileUrl || (typeof c === 'string' && c.startsWith('http'))) {
            const url = c.fileUrl || c;
            const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)$/i);

            return (
                <div className="flex flex-col gap-4 items-center p-4">
                    {isImage ? (
                        <img src={url} alt="Output" className="max-h-96 rounded-lg border border-slate-700" />
                    ) : (
                        <div className="p-4 bg-slate-800 rounded border border-slate-700">
                            <FileText className="w-8 h-8 text-slate-400 mb-2" />
                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                Ver Archivo Generado
                            </a>
                        </div>
                    )}
                </div>
            );
        }

        // Text / JSON
        const text = typeof displayedVersion.content === 'object'
            ? JSON.stringify(displayedVersion.content, null, 2)
            : String(displayedVersion.content);

        return (
            <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono overflow-x-auto">
                {text}
            </pre>
        );
    };

    if (!outputData && !isLoading) {
        // Empty state is handled by parent or empty render
        return null;
    }

    if (!displayedVersion && isLoading) return <div className="text-slate-500 flex gap-2"><Loader2 className="animate-spin w-4 h-4" /> Cargando...</div>;
    if (!displayedVersion) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Resultados</h2>
                {error && <span className="text-red-400 text-sm">{error}</span>}
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span className="font-medium text-white">Versión {displayedVersion.version}</span>
                        {displayedVersion.status === 'APPROVED' && (
                            <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded border border-green-500/20">Aprobado</span>
                        )}
                        {displayedVersion.runInfo?.validated && (
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs rounded border border-emerald-500/20">Validado</span>
                        )}
                        {displayedVersion.runInfo?.fallbackWarning && (
                            <span className="text-yellow-500 text-xs flex items-center gap-1" title={displayedVersion.runInfo.fallbackWarning}>
                                <AlertTriangle className="w-3 h-3" /> Warning
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {!isEditing && (
                            <>
                                <div className="flex gap-2 mr-2">
                                    <button
                                        onClick={() => {
                                            setIsEditing(true);
                                            setEditContent(typeof displayedVersion.content === 'object' ? JSON.stringify(displayedVersion.content, null, 2) : String(displayedVersion.content));
                                        }}
                                        className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                                        title="Editar contenido"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                </div>
                                {displayedVersion.status !== 'APPROVED' && (
                                    <button
                                        onClick={handleApprove}
                                        disabled={isSaving}
                                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors font-medium flex items-center gap-2 leading-none"
                                    >
                                        {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Aprobar"}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="bg-slate-900 rounded-lg p-4 overflow-hidden border border-slate-800">
                    {isEditing ? (
                        <div className="space-y-3">
                            <textarea
                                value={editContent}
                                onChange={e => setEditContent(e.target.value)}
                                className="w-full h-80 bg-slate-800 text-slate-200 p-3 rounded border border-slate-700 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setIsEditing(false)} className="px-3 py-2 text-slate-400 hover:text-white text-sm">Cancelar</button>
                                <button onClick={handleSaveManual} disabled={isSaving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded flex items-center gap-2">
                                    <Save className="w-4 h-4" /> {isSaving ? "Guardando..." : "Guardar Cambios"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        renderContentPreview()
                    )}
                </div>
            </div>

            {/* History List */}
            {outputData && outputData.versions.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Historial
                    </h3>
                    <div className="space-y-1">
                        {outputData.versions.map(v => (
                            <button
                                key={v.id}
                                onClick={() => fetchOutput(v.version)}
                                className={`w-full flex items-center justify-between p-2 rounded text-sm transition-colors text-left ${displayedVersion.id === v.id ? "bg-slate-700/50 border border-slate-600 text-white" : "hover:bg-slate-800 text-slate-400 border border-transparent"
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    <span className="font-mono opacity-50">v{v.version}</span>
                                    <span>{v.provider === 'MANUAL' ? 'Edición Manual' : `${v.provider}/${v.model}` || 'AI Generated'}</span>
                                    {v.status === 'APPROVED' && <span className="text-green-400 text-xs">●</span>}
                                </span>
                                <span className="text-xs opacity-50">{formatDate(v.createdAt)}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
