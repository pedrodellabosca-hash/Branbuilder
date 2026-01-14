
"use client";

import { useEffect, useState } from "react";
import { Settings, Save, AlertTriangle } from "lucide-react";

export default function OrgModelsPage() {
    const [config, setConfig] = useState({ provider: "", model: "", preset: "" });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");

    useEffect(() => {
        fetch("/api/org-admin/models")
            .then(res => res.json())
            .then(data => {
                if (data.provider) setConfig(data);
            })
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setMsg("");
        try {
            const res = await fetch("/api/org-admin/models", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config)
            });
            const json = await res.json();
            if (res.ok) {
                setMsg("Configuration saved successfully.");
                setConfig(json);
            } else {
                setMsg("Error: " + json.error);
            }
        } catch (e: any) {
            setMsg("Error: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-slate-500">Loading config...</div>;

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <header>
                <h1 className="text-2xl font-bold text-white mb-2">AI Configuration</h1>
                <p className="text-slate-400">Manage provider and model preferences for your organization.</p>
            </header>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">AI Provider</label>
                    <select
                        value={config.provider}
                        onChange={e => setConfig({ ...config, provider: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-white"
                    >
                        <option value="MOCK">MOCK (Simulation)</option>
                        <option value="OPENAI">OpenAI</option>
                        <option value="ANTHROPIC">Anthropic</option>
                    </select>
                    {config.provider === "MOCK" && (
                        <p className="mt-2 text-xs text-yellow-500 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Mock mode generates random placeholder text. No credits used.
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Default Model</label>
                    <input
                        type="text"
                        value={config.model}
                        onChange={e => setConfig({ ...config, model: e.target.value })}
                        placeholder="e.g. gpt-4o-mini"
                        className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-white"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Quality Preset</label>
                    <select
                        value={config.preset}
                        onChange={e => setConfig({ ...config, preset: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-white"
                    >
                        <option value="fast">Fast (Lower Cost)</option>
                        <option value="balanced">Balanced</option>
                        <option value="quality">High Quality</option>
                    </select>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                    <span className={`text-sm ${msg.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>
                        {msg}
                    </span>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md flex items-center gap-2 font-medium disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? "Saving..." : "Save Configuration"}
                    </button>
                </div>
            </div>
        </div>
    );
}
