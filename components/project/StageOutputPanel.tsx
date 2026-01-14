
"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, AlertCircle, Clock, Sparkles, Pencil, X, Save, AlertTriangle, Image as ImageIcon, FileText, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

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
    // Optional callbacks if parent needs to know things
    onStatusChange?: () => void;
    refreshTrigger?: number;
}

export function StageOutputPanel({ projectId, stageKey, onStatusChange, refreshTrigger }: StageOutputPanelProps) {
    const router = useRouter();
    const [outputData, setOutputData] = useState<OutputData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Editing State
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState("");
    const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

    // Helper for visual editing
    const [editMode, setEditMode] = useState<"visual" | "code">("visual");

    const updateField = (path: string[], value: any) => {
        try {
            const currentContent = JSON.parse(editContent);
            const newContent = { ...currentContent };

            // Navigate/Create path
            let current = newContent;
            for (let i = 0; i < path.length - 1; i++) {
                current = current[path[i]];
            }
            current[path[path.length - 1]] = value;

            setEditContent(JSON.stringify(newContent, null, 2));
        } catch (e) {
            console.error("Error updating field", e);
        }
    };

    const renderVisualEditor = (data: any, path: string[] = []) => {
        if (Array.isArray(data)) {
            return (
                <div className="space-y-3 pl-4 border-l-2 border-slate-800">
                    {data.map((item, i) => (
                        <div key={i} className="relative group">
                            <span className="absolute -left-6 top-2 text-xs text-slate-600">#{i + 1}</span>
                            {renderVisualEditor(item, [...path, i.toString()])}
                        </div>
                    ))}
                    {/* Add item button could go here */}
                </div>
            );
        }

        if (typeof data === 'object' && data !== null) {
            return (
                <div className="space-y-4">
                    {Object.entries(data).map(([key, value]) => (
                        <div key={key} className="bg-slate-900/50 p-4 rounded border border-slate-800/50">
                            <label className="block text-xs uppercase font-bold text-indigo-400 mb-2 tracking-wider">
                                {key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}
                            </label>
                            {renderVisualEditor(value, [...path, key])}
                        </div>
                    ))}
                </div>
            );
        }

        // Leaf nodes
        const isLongText = typeof data === 'string' && data.length > 50;
        const inputClasses = "w-full bg-slate-800 text-slate-200 p-2 rounded border border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all";

        if (isLongText) {
            return (
                <textarea
                    value={String(data)}
                    onChange={(e) => updateField(path, e.target.value)}
                    className={`${inputClasses} h-24 text-sm`}
                    aria-label={`Editar campo ${path.slice(-1)[0] || 'texto'}`}
                />
            );
        }

        return (
            <input
                type={typeof data === 'number' ? 'number' : 'text'}
                value={String(data)}
                onChange={(e) => {
                    const val = typeof data === 'number' ? parseFloat(e.target.value) : e.target.value;
                    updateField(path, val);
                }}
                className={`${inputClasses} h-10`}
                aria-label={`Editar campo ${path.slice(-1)[0] || 'valor'}`}
            />
        );
    };

    const isReadOnly = isSaving || isLoading;

    const isMountedRef = useRef(true);

    const fetchOutput = async (version?: number) => {
        setIsLoading(true);
        setError(null);
        try {
            const url = version
                ? `/api/projects/${projectId}/stages/${stageKey}/output?version=${version}`
                : `/api/projects/${projectId}/stages/${stageKey}/output`;

            const res = await fetch(url);
            if (!res.ok) {
                throw new Error("No se pudo cargar el resultado");
            }
            const data: OutputData = await res.json();

            if (isMountedRef.current) {
                setOutputData(data);
                setSelectedVersion(version || null);
            }
        } catch (err) {
            console.error("Fetch output error:", err);
            if (isMountedRef.current) {
                setError(err instanceof Error ? err.message : "Error cargando resultado");
            }
        } finally {
            if (isMountedRef.current) setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOutput();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId, stageKey, refreshTrigger]); // Refetch on mount or key change

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
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Error guardando la versión");
            }
            const data = await res.json(); // Get new version data

            // Switch to the new version immediately
            if (data && data.version) {
                setSelectedVersion(data.version);
                await fetchOutput(data.version);
            } else {
                await fetchOutput();
            }

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
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Error al aprobar la versión");
            }

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

    const renderMarkdown = (text: string) => {
        const lines = text.split('\n');
        return (
            <div className="space-y-1 text-slate-300">
                {lines.map((line, i) => {
                    // Headers
                    if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold text-white mt-6 mb-3">{line.slice(2)}</h1>;
                    if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold text-indigo-200 mt-5 mb-2 border-b border-slate-800 pb-2">{line.slice(3)}</h2>;
                    if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-bold text-slate-100 mt-4 mb-2">{line.slice(4)}</h3>;

                    // List items
                    if (line.trim().startsWith('- ')) {
                        const content = line.trim().slice(2);
                        // Handle bold inside list
                        const parts = content.split(/(\*\*.*?\*\*)/g);
                        return (
                            <div key={i} className="flex gap-2 ml-1 mb-1">
                                <span className="text-indigo-500 mt-1.5">•</span>
                                <span className="leading-relaxed">
                                    {parts.map((part, j) =>
                                        part.startsWith('**') && part.endsWith('**')
                                            ? <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong>
                                            : part
                                    )}
                                </span>
                            </div>
                        );
                    }

                    if (line.trim() === '') return <div key={i} className="h-2" />;

                    // Paragraphs with Bold support
                    const parts = line.split(/(\*\*.*?\*\*)/g);
                    return (
                        <p key={i} className="leading-relaxed mb-1">
                            {parts.map((part, j) => {
                                if (part.startsWith('**') && part.endsWith('**')) {
                                    return <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
                                }
                                return part;
                            })}
                        </p>
                    );
                })}
            </div>
        );
    };

    const renderJsonValue = (value: any): React.ReactNode => {
        if (Array.isArray(value)) {
            return (
                <ul className="list-none ml-2 space-y-2">
                    {value.map((item, i) => (
                        <li key={i} className="pl-4 border-l-2 border-slate-800 relative">
                            {typeof item === 'object' ? renderJsonValue(item) : <span className="text-slate-300">{String(item)}</span>}
                        </li>
                    ))}
                </ul>
            );
        }
        if (typeof value === 'object' && value !== null) {
            return (
                <div className="grid grid-cols-1 gap-3 my-2">
                    {Object.entries(value).map(([k, v]) => (
                        <div key={k} className="bg-slate-950/50 p-3 rounded border border-slate-800/50">
                            <span className="text-indigo-400 text-xs uppercase font-bold tracking-wider block mb-1">{k.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim().replace(/\b\w/g, l => l.toUpperCase())}</span>
                            <div className="">{renderJsonValue(v)}</div>
                        </div>
                    ))}
                </div>
            );
        }
        // If value looks like markdown text, render it
        const strVal = String(value);
        if (strVal.includes('\n') || strVal.includes('**') || strVal.includes('# ')) {
            return renderMarkdown(strVal);
        }
        return <span className="text-slate-300 whitespace-pre-wrap">{strVal}</span>;
    };




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

        // Handle structured JSON object
        if (typeof displayedVersion.content === 'object' && displayedVersion.content !== null) {
            // Special handling for Naming stage
            if (stageKey === 'naming' && 'items' in displayedVersion.content && Array.isArray((displayedVersion.content as any).items)) {
                const namingContent = displayedVersion.content as any;
                const items = namingContent.items;
                const selectedName = namingContent.selectedName;
                const contestWinner = namingContent.contest_winner;

                const handleSelectName = (name: string) => {
                    if (isReadOnly) return;

                    const newContent = { ...namingContent, selectedName: name };

                    setEditContent(JSON.stringify(newContent, null, 2));
                    setIsEditing(true);
                };

                return (
                    <div className="space-y-6">
                        {/* Contest Winner Banner */}
                        {contestWinner && (
                            <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-indigo-500/30 p-4 rounded-xl flex items-start gap-4 shadow-lg relative overflow-hidden group">
                                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/40 shrink-0">
                                    <Sparkles className="w-5 h-5 text-indigo-300" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-indigo-200 uppercase tracking-wider mb-1">
                                        Recomendación de Nexus
                                    </h4>
                                    <p className="text-lg font-medium text-white">
                                        El sistema sugiere <span className="font-bold text-indigo-300">"{contestWinner}"</span> como la opción más estratégica.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {items.map((item: any, idx: number) => {
                                const isSelected = item.name === selectedName;
                                const isWinner = item.name === contestWinner;

                                return (
                                    <div
                                        key={idx}
                                        className={cn(
                                            "relative p-5 rounded-xl border transition-all duration-200 flex flex-col h-full",
                                            isSelected
                                                ? "bg-emerald-950/20 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                                                : isWinner
                                                    ? "bg-indigo-950/20 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                                                    : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex flex-col gap-1">
                                                <h4 className={cn("text-xl font-bold tracking-tight", isSelected ? "text-emerald-400" : isWinner ? "text-indigo-300" : "text-slate-200")}>
                                                    {item.name}
                                                </h4>
                                                {isWinner && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                                                        <Sparkles className="w-3 h-3" /> Recomendado
                                                    </span>
                                                )}
                                            </div>

                                            {isSelected ? (
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">Elegido</span>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleSelectName(item.name)}
                                                    disabled={isReadOnly}
                                                    className="px-3 py-1 text-xs font-medium text-slate-400 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 hover:border-slate-500"
                                                >
                                                    Elegir
                                                </button>
                                            )}
                                        </div>

                                        <p className="text-sm text-slate-400 mb-4 leading-relaxed flex-grow">
                                            {item.rationale}
                                        </p>

                                        {item.domainHints && item.domainHints.length > 0 && (
                                            <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-800/50">
                                                {item.domainHints.map((domain: string, dIdx: number) => (
                                                    <span key={dIdx} className="text-[10px] px-2 py-0.5 bg-slate-950 text-slate-500 rounded border border-slate-800 font-mono">
                                                        {domain}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {namingContent.notes && (
                            <div className="text-sm text-slate-400 bg-slate-950/50 p-4 rounded-lg border border-slate-800 mt-6">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Nota Estratégica</h4>
                                <p className="whitespace-pre-wrap leading-relaxed">{namingContent.notes}</p>
                            </div>
                        )}
                    </div>
                );
            }

            // Special handling for Visual Identity stage (Image Selection)
            if (stageKey === 'visual_identity' && 'options' in displayedVersion.content && Array.isArray((displayedVersion.content as any).options)) {
                const identityContent = displayedVersion.content as any;
                const options = identityContent.options;
                const selectedId = identityContent.selectedOption?.id;

                const handleSelectOption = (option: any) => {
                    if (isReadOnly) return;
                    const newContent = { ...identityContent, selectedOption: option };
                    setEditContent(JSON.stringify(newContent, null, 2));
                    setIsEditing(true);
                };

                return (
                    <div className="space-y-8">
                        <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
                            <h3 className="text-xl font-bold text-white mb-2">{identityContent.title}</h3>
                            <p className="text-slate-400">{identityContent.concept}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {options.map((opt: any, idx: number) => {
                                const isSelected = opt.id === selectedId;
                                return (
                                    <div
                                        key={idx}
                                        className={cn(
                                            "group relative overflow-hidden rounded-xl border transition-all duration-300",
                                            isSelected
                                                ? "bg-slate-900 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                                                : "bg-slate-900 border-slate-800 hover:border-slate-600"
                                        )}
                                    >
                                        <div className="aspect-video w-full bg-slate-950 relative overflow-hidden">
                                            {opt.imageUrl ? (
                                                <img
                                                    src={opt.imageUrl}
                                                    alt={opt.name}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-700">
                                                    <ImageIcon className="w-12 h-12 opacity-20" />
                                                </div>
                                            )}

                                            {isSelected && (
                                                <div className="absolute top-3 right-3 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3" /> SELECCIONADO
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-5">
                                            <h4 className="text-lg font-bold text-white mb-2">{opt.name}</h4>
                                            <p className="text-sm text-slate-400 mb-4 line-clamp-3">{opt.description}</p>

                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {opt.colorPalette?.map((color: string, cIdx: number) => (
                                                    <div key={cIdx} className="w-6 h-6 rounded-full border border-slate-700 shadow-sm"
                                                        // eslint-disable-next-line react-dom/no-unsafe-inline-style
                                                        style={{ backgroundColor: color }} title={color}
                                                    />
                                                ))}
                                            </div>

                                            <button
                                                onClick={() => handleSelectOption(opt)}
                                                disabled={isReadOnly}
                                                className={cn(
                                                    "w-full py-2.5 rounded-lg text-sm font-bold transition-all",
                                                    isSelected
                                                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                                        : "bg-slate-800 text-slate-300 hover:bg-white hover:text-black"
                                                )}
                                            >
                                                {isSelected ? "Seleccionado" : "Elegir esta propuesta"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            }
            return (
                <div className="space-y-4">
                    {Object.entries(displayedVersion.content).map(([key, value]) => (
                        <div key={key} className="bg-slate-950 p-4 rounded-lg border border-slate-800/50">
                            <h3 className="text-blue-400 text-sm font-bold uppercase tracking-wider mb-2 border-b border-slate-800 pb-2">
                                {key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim().replace(/\b\w/g, l => l.toUpperCase())}
                            </h3>
                            <div className="text-sm leading-relaxed">
                                {renderJsonValue(value)}
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        // Fallback for simple string
        return (
            <div className="prose prose-invert max-w-none">
                <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {String(displayedVersion.content)}
                </p>
            </div>
        );
    };

    if (!outputData && !isLoading) {
        return (
            <div className="space-y-6">
                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                    </div>
                )}
                <div className="text-slate-500 text-sm p-4 border border-dashed border-slate-700 rounded-lg text-center">
                    No hay resultados generados para esta etapa aún.
                </div>
            </div>
        );
    }

    if (!displayedVersion && isLoading) return <div className="text-slate-500 flex gap-2"><Loader2 className="animate-spin w-4 h-4" /> Cargando...</div>;
    if (!displayedVersion) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Resultados</h2>
                {error && <span className="text-red-400 text-sm">{error}</span>}
            </div>

            {process.env.NODE_ENV === "development" && (
                <div className="p-2 bg-black/50 text-[10px] font-mono text-green-400 rounded overflow-x-auto mb-4 border border-green-900">
                    <strong>DEBUG DATA:</strong>
                    <pre>{JSON.stringify({
                        loaded: !!outputData,
                        hasLatest: !!outputData?.latestVersion,
                        versionConfig: outputData?.latestVersion?.runInfo,
                        versionsCount: outputData?.versions?.length
                    }, null, 2)}</pre>
                </div>
            )}

            {/* MOCK/Provider Warning */}
            {outputData?.latestVersion?.provider === 'MOCK' && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span><strong>Modo MOCK activo.</strong> Los textos son demostrativos (OpenAI no conectado).</span>
                </div>
            )}

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
                        {displayedVersion.provider && (
                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded border border-blue-500/20 font-mono">
                                {displayedVersion.provider} / {displayedVersion.model}
                            </span>
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
                        <div className="space-y-4">
                            <div className="flex justify-end border-b border-slate-800 pb-2 mb-2">
                                <div className="flex bg-slate-800 rounded p-1">
                                    <button
                                        onClick={() => setEditMode("visual")}
                                        className={cn("px-3 py-1 text-xs font-medium rounded transition-colors", editMode === "visual" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white")}
                                    >
                                        Formulario
                                    </button>
                                    <button
                                        onClick={() => setEditMode("code")}
                                        className={cn("px-3 py-1 text-xs font-medium rounded transition-colors", editMode === "code" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white")}
                                    >
                                        Código (JSON)
                                    </button>
                                </div>
                            </div>

                            {editMode === "code" ? (
                                <textarea
                                    value={editContent}
                                    onChange={e => setEditContent(e.target.value)}
                                    className="w-full h-[600px] bg-slate-950 text-emerald-400 p-4 rounded border border-slate-800 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed"
                                    spellCheck={false}
                                    aria-label="Editor de código JSON"
                                />
                            ) : (
                                <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                    {(() => {
                                        try {
                                            const parsed = JSON.parse(editContent);
                                            return renderVisualEditor(parsed);
                                        } catch (e) {
                                            return <div className="p-4 text-red-400 bg-red-900/20 border border-red-900/50 rounded">Error en el formato JSON. Cambia al modo Código para corregirlo.</div>;
                                        }
                                    })()}
                                </div>
                            )}

                            <div className="flex justify-between items-center pt-4 border-t border-slate-800 mt-2">
                                <span className="text-xs text-slate-500">
                                    {editMode === 'visual' ? 'Editando en modo formulario visual' : 'Editando estructura JSON raw'}
                                </span>
                                <div className="flex gap-2">
                                    <button onClick={() => setIsEditing(false)} className="px-3 py-2 text-slate-400 hover:text-white text-sm transition-colors">Cancelar</button>
                                    <button onClick={handleSaveManual} disabled={isSaving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded shadow-lg shadow-emerald-900/20 flex items-center gap-2 transition-all hover:scale-105">
                                        <Save className="w-4 h-4" /> {isSaving ? "Guardando..." : "Guardar Cambios"}
                                    </button>
                                </div>
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
