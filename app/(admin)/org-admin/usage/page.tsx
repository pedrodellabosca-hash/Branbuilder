
"use client";

import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, Zap } from "lucide-react";

export default function OrgUsagePage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/org-admin/usage?limit=50")
            .then(res => res.json())
            .then(setData)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="text-slate-500 p-8">Loading usage stats...</div>;
    if (!data) return <div className="text-red-400 p-8">Error loading usage</div>;

    const { summary, records } = data;

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <header>
                <h1 className="text-2xl font-bold text-white mb-2">Token Usage</h1>
                <p className="text-slate-400">Monitoring consumption and limits</p>
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-lg">
                    <div className="text-slate-500 text-sm mb-1 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> Monthly Usage
                    </div>
                    <div className="text-2xl font-bold text-white">
                        {summary.monthlyTokensUsed.toLocaleString()} <span className="text-sm font-normal text-slate-500">/ {summary.monthlyTokenLimit.toLocaleString()}</span>
                    </div>
                    <div className="mt-2 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                            className="bg-purple-500 h-full"
                            style={{ width: `${Math.min(100, (summary.monthlyTokensUsed / summary.monthlyTokenLimit) * 100)}%` }}
                        />
                    </div>
                </div>

                <div className="p-5 bg-slate-900 border border-slate-800 rounded-lg">
                    <div className="text-slate-500 text-sm mb-1 flex items-center gap-2">
                        <Zap className="w-4 h-4" /> Bonus Tokens
                    </div>
                    <div className="text-2xl font-bold text-white">
                        {summary.bonusTokens.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Extra flexibility</div>
                </div>
            </div>

            {/* Recent Table */}
            <section className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800">
                    <h3 className="font-semibold text-white">Recent Activity</h3>
                </div>
                <table className="w-full text-sm text-left text-slate-400">
                    <thead className="text-xs uppercase bg-slate-800/50 text-slate-300">
                        <tr>
                            <th className="px-6 py-3">Time</th>
                            <th className="px-6 py-3">Stage</th>
                            <th className="px-6 py-3">Model</th>
                            <th className="px-6 py-3 text-right">Input</th>
                            <th className="px-6 py-3 text-right">Output</th>
                            <th className="px-6 py-3 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {records.map((r: any) => (
                            <tr key={r.id} className="hover:bg-slate-800/30">
                                <td className="px-6 py-3 text-xs">{new Date(r.createdAt).toLocaleString()}</td>
                                <td className="px-6 py-3 font-mono text-xs">{r.stageKey || "-"}</td>
                                <td className="px-6 py-3">{r.model}</td>
                                <td className="px-6 py-3 text-right font-mono">{r.inputTokens}</td>
                                <td className="px-6 py-3 text-right font-mono">{r.outputTokens}</td>
                                <td className="px-6 py-3 text-right font-bold text-white font-mono">{r.totalTokens}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </div>
    );
}
