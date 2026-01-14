"use client";

import { useEffect, useState } from "react";
import { Activity, Database, Server, Clock, AlertTriangle } from "lucide-react";
import { adminCopy } from "@/lib/admin/adminCopy";

export default function AdminHealthPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/health");
            if (!res.ok) throw new Error("Failed to fetch health");
            const json = await res.json();
            setData(json);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    if (loading && !data) return <div className="p-8 text-slate-400">Loading system health...</div>;
    if (error) return <div className="p-8 text-red-400">Error: {error}</div>;

    const { system, queue, recentWorkers } = data;

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">{adminCopy.systemHealth.title}</h1>
                    <p className="text-slate-400 text-sm">{adminCopy.jobs.filters.refresh}</p>
                </div>
                <button
                    onClick={fetchData}
                    className="px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-white rounded border border-slate-700 transition-colors"
                >
                    {adminCopy.systemHealth.refresh}
                </button>
            </header>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card
                    label={adminCopy.systemHealth.workersOnline}
                    value={system.workersOnline}
                    icon={Server}
                    status={system.workersOnline > 0 ? "good" : "bad"}
                />
                <Card
                    label={adminCopy.systemHealth.jobQueue}
                    value={`${queue.queued} / ${queue.processing}`}
                    subtext="Queued / Processing"
                    icon={Database}
                    status={queue.queued < 10 ? "good" : queue.queued < 50 ? "warn" : "bad"}
                />
                <Card
                    label={adminCopy.systemHealth.aiProvider}
                    value={system.aiProvider.provider}
                    subtext={system.aiProvider.ready ? adminCopy.systemHealth.status.operational : adminCopy.systemHealth.status.degraded}
                    icon={Activity}
                    status={system.aiProvider.ready ? "good" : "warn"}
                />
            </div>

            {/* Workers Table */}
            <section className="space-y-4">
                <h2 className="text-lg font-semibold text-white">{adminCopy.systemHealth.workersOnline}</h2>
                <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left text-slate-400">
                        <thead className="text-xs uppercase bg-slate-800/50 text-slate-300">
                            <tr>
                                <th className="px-4 py-3">Worker ID</th>
                                <th className="px-4 py-3">{adminCopy.jobs.table.created}</th>
                                <th className="px-4 py-3">{adminCopy.systemHealth.lastUpdated}</th>
                                <th className="px-4 py-3">Version</th>
                                <th className="px-4 py-3">{adminCopy.jobs.table.status}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentWorkers.map((w: any) => {
                                const isOnline = (new Date().getTime() - new Date(w.lastSeenAt).getTime()) < 30000;
                                return (
                                    <tr key={w.id} className="border-t border-slate-800/50">
                                        <td className="px-4 py-3 font-mono text-slate-200">{w.workerId.slice(0, 20)}...</td>
                                        <td className="px-4 py-3">{new Date(w.startedAt).toLocaleString()}</td>
                                        <td className="px-4 py-3">{new Date(w.lastSeenAt).toLocaleTimeString()}</td>
                                        <td className="px-4 py-3 font-mono text-xs">{w.version || "N/A"}</td>
                                        <td className="px-4 py-3">
                                            {isOnline ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-400">
                                                    {adminCopy.systemHealth.status.operational}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-400">
                                                    {adminCopy.systemHealth.status.offline}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {recentWorkers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                                        No workers registered yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

function Card({ label, value, subtext, icon: Icon, status }: any) {
    const colors = {
        good: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        warn: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
        bad: "text-red-400 bg-red-500/10 border-red-500/20",
        neutral: "text-slate-400 bg-slate-800 border-slate-700"
    };

    const theme = colors[status as keyof typeof colors] || colors.neutral;

    return (
        <div className={`p-5 rounded-lg border ${theme.split(" ")[2]} bg-slate-900`}>
            <div className="flex justify-between items-start mb-2">
                <span className="text-slate-400 text-sm font-medium">{label}</span>
                <Icon className={`w-5 h-5 ${theme.split(" ")[0]}`} />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
            {subtext && <div className="text-xs text-slate-500 mt-1">{subtext}</div>}
        </div>
    );
}
