"use client";

import { adminCopy } from "@/lib/admin/adminCopy";
import { AlertTriangle, Play, RefreshCw, ShieldAlert } from "lucide-react";
import { useState } from "react";

export default function AdminActionsPage() {
    const [stage, setStage] = useState("");
    const [projectId, setProjectId] = useState("");
    const [orgId, setOrgId] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleRun = async (regenerate: boolean) => {
        setLoading(true);
        setError(null);
        setResult(null);

        // Basic validation (in a real app, we'd use select dropdowns fetched from DB)
        if (!stage || !projectId) {
            setError("Stage and Project ID are required");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/admin/actions/stage", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    stage,
                    projectId,
                    orgId, // Optional if backend infers it
                    regenerate
                })
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Execution failed");
            setResult(json);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <header>
                <h1 className="text-2xl font-bold text-white mb-2">{adminCopy.actions.title}</h1>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex gap-3 text-yellow-200">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <p className="text-sm">{adminCopy.actions.warning}</p>
                </div>
            </header>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs text-slate-400 uppercase font-semibold">{adminCopy.actions.form.projectSelect}</label>
                        <input
                            type="text"
                            placeholder="Project CUID"
                            value={projectId}
                            onChange={e => setProjectId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-300 font-mono text-sm"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-slate-400 uppercase font-semibold">{adminCopy.actions.form.stageSelect}</label>
                        <input
                            type="text"
                            placeholder="e.g. naming, manifesto..."
                            value={stage}
                            onChange={e => setStage(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-300 font-mono text-sm"
                        />
                    </div>
                </div>

                <div className="flex gap-4 pt-4">
                    <button
                        onClick={() => handleRun(false)}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-medium disabled:opacity-50"
                    >
                        <Play className="w-4 h-4" />
                        {adminCopy.actions.form.actions.run}
                    </button>
                    <button
                        onClick={() => handleRun(true)}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded font-medium disabled:opacity-50"
                    >
                        <RefreshCw className="w-4 h-4" />
                        {adminCopy.actions.form.actions.regenerate}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded p-4 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {result && (
                <div className="bg-green-500/10 border border-green-500/20 rounded p-4 space-y-2">
                    <h3 className="font-semibold text-green-400">{adminCopy.actions.results.title}</h3>
                    <div className="font-mono text-sm text-green-300">
                        {adminCopy.actions.results.jobId}: {result.jobId}
                    </div>
                    <pre className="mt-2 bg-slate-950 p-3 rounded text-xs text-slate-400 overflow-x-auto">
                        {JSON.stringify(result, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}
