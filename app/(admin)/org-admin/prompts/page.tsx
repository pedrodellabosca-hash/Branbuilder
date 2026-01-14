
"use client";

import { useEffect, useState } from "react";
import { Database, Plus, Save } from "lucide-react";

export default function OrgPromptsPage() {
    const [prompts, setPrompts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/org-admin/prompts")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setPrompts(data);
            })
            .finally(() => setLoading(false));
    }, []);

    // MVP: View List only for now. Adding full CRUD UI is complex for single iteration.
    // We will show list and a "Coming Soon" or simple JSON view.

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Prompt Registry</h1>
                    <p className="text-slate-400 text-sm">Manage system prompts and versions</p>
                </div>
                <button disabled className="px-3 py-1.5 opacity-50 cursor-not-allowed bg-purple-600 text-white rounded text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4" /> New Version
                </button>
            </header>

            <div className="grid gap-4">
                {loading ? <div className="text-slate-500">Loading...</div> : prompts.length === 0 ? (
                    <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-lg text-slate-500">
                        No prompts found. Default system prompts are used.
                    </div>
                ) : (
                    prompts.map(p => (
                        <div key={p.id} className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-semibold text-white">{p.name}</h3>
                                    <div className="text-xs text-slate-500 font-mono mt-1">
                                        {p.stage} / {p.version}
                                    </div>
                                </div>
                                {p.isActive && (
                                    <span className="bg-green-500/10 text-green-400 text-xs px-2 py-1 rounded border border-green-500/20">
                                        Active
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-slate-400 mb-3">{p.notes || "No notes"}</div>
                            <pre className="bg-slate-950 p-3 rounded text-xs text-slate-300 font-mono overflow-x-auto max-h-32">
                                {JSON.stringify(p.prompts, null, 2)}
                            </pre>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
