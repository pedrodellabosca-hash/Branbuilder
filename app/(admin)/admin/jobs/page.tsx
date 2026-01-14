"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Smartphone, Eye } from "lucide-react";
import Link from "next/link";
import { adminCopy } from "@/lib/admin/adminCopy";

export default function AdminJobsPage() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stageFilter, setStageFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: "50" });
            if (stageFilter) params.append("stage", stageFilter);
            if (statusFilter) params.append("status", statusFilter);

            const res = await fetch(`/api/admin/jobs?${params.toString()}`);
            const json = await res.json();
            if (json.jobs) setJobs(json.jobs);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, [stageFilter, statusFilter]);

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">{adminCopy.jobs.title}</h1>
                    <p className="text-slate-400 text-sm">{adminCopy.jobs.detail.timeline}</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2"
                    >
                        <option value="">{adminCopy.jobs.filters.status}</option>
                        <option value="QUEUED">{adminCopy.jobs.status.QUEUED}</option>
                        <option value="PROCESSING">{adminCopy.jobs.status.PROCESSING}</option>
                        <option value="DONE">{adminCopy.jobs.status.DONE}</option>
                        <option value="FAILED">{adminCopy.jobs.status.FAILED}</option>
                    </select>
                    <input
                        type="text"
                        placeholder={adminCopy.jobs.filters.stage}
                        value={stageFilter}
                        onChange={(e) => setStageFilter(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 w-32"
                    />
                    <button
                        onClick={fetchJobs}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded border border-slate-700 transition-colors"
                        title={adminCopy.jobs.filters.refresh}
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </header>

            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-400">
                        <thead className="text-xs uppercase bg-slate-800/50 text-slate-300">
                            <tr>
                                <th className="px-4 py-3">{adminCopy.jobs.table.id}</th>
                                <th className="px-4 py-3">{adminCopy.jobs.table.status}</th>
                                <th className="px-4 py-3">{adminCopy.jobs.table.stage}</th>
                                <th className="px-4 py-3">{adminCopy.jobs.table.duration}</th>
                                <th className="px-4 py-3">Org/Proj</th>
                                <th className="px-4 py-3 text-right">{adminCopy.jobs.table.actions}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {jobs.map((job) => (
                                <tr key={job.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-mono text-white text-xs hover:text-blue-400">
                                            <Link href={`/admin/jobs/${job.id}`}>{job.id.slice(0, 8)}...</Link>
                                        </div>
                                        <div className="text-xs text-slate-500">{new Date(job.createdAt).toLocaleTimeString()}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge status={job.status} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-slate-300 text-xs font-mono">{job.stage || job.type}</div>
                                    </td>
                                    <td className="px-4 py-3 text-xs font-mono">
                                        {job.completedAt && job.startedAt
                                            ? `${((new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) / 1000).toFixed(1)}s`
                                            : "-"}
                                    </td>
                                    <td className="px-4 py-3 text-xs font-mono opacity-60">
                                        {job.projectId ? `Proj:${job.projectId.slice(0, 4)}` : "Global"}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Link
                                            href={`/admin/jobs/${job.id}`}
                                            className="inline-flex items-center justify-center p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {jobs.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                                        No jobs found matching criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles = {
        QUEUED: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
        PROCESSING: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        DONE: "bg-green-500/10 text-green-400 border-green-500/20",
        FAILED: "bg-red-500/10 text-red-400 border-red-500/20"
    };

    const cls = styles[status as keyof typeof styles] || "bg-slate-700 text-slate-300";

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${cls}`}>
            {status}
        </span>
    );
}
