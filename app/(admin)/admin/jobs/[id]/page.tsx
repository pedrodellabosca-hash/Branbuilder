"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, AlertCircle, CheckCircle, Loader2, Copy, RotateCw, XCircle, FileText } from "lucide-react";
import Link from "next/link";
import { adminCopy } from "@/lib/admin/adminCopy";

export default function AdminJobDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [job, setJob] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [output, setOutput] = useState<any>(null);

    const fetchJob = async () => {
        try {
            const res = await fetch(`/api/admin/jobs/${id}`);
            if (!res.ok) throw new Error("Job not found");
            const data = await res.json();
            setJob(data.job);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!id) return;
        fetchJob();
    }, [id]);

    const handleAction = async (action: 'retry' | 'fail' | 'output') => {
        setActionLoading(true);
        try {
            if (action === 'output') {
                const res = await fetch(`/api/admin/jobs/${id}/output`);
                const json = await res.json();
                if (json.output) {
                    setOutput(json.output);
                    alert("Output loaded below");
                } else {
                    alert("No associated output found");
                }
                setActionLoading(false);
                return;
            }

            const res = await fetch(`/api/admin/jobs/${id}/${action}`, { method: 'POST' });
            if (!res.ok) throw new Error("Action failed");
            fetchJob(); // Refresh
        } catch (e: any) {
            alert(e.message);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div className="p-8"><Loader2 className="animate-spin text-white" /></div>;
    if (error) return <div className="p-8 text-red-400">Error: {error}</div>;
    if (!job) return null;

    const duration = job.completedAt && job.startedAt
        ? ((new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) / 1000).toFixed(2) + 's'
        : '-';

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Link href="/admin/jobs" className="inline-flex items-center text-slate-400 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {adminCopy.jobs.detail.back}
            </Link>

            <header className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                        Job {job.id.slice(0, 8)}
                        <span className={`px-2 py-1 rounded text-xs font-mono font-medium 
                            ${job.status === 'DONE' ? 'bg-green-500/20 text-green-400' :
                                job.status === 'FAILED' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {job.status}
                        </span>
                    </h1>
                    <p className="text-slate-400 font-mono text-sm">{job.id}</p>
                </div>
                <div className="flex gap-2">
                    {/* Control Buttons (V3) */}
                    {job.status === 'FAILED' && (
                        <button
                            onClick={() => handleAction('retry')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            <RotateCw className="w-3 h-3" />
                            {adminCopy.jobs.detail.actions.retry}
                        </button>
                    )}
                    {(job.status === 'PROCESSING' || job.status === 'QUEUED') && (
                        <button
                            onClick={() => handleAction('fail')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            <XCircle className="w-3 h-3" />
                            {adminCopy.jobs.detail.actions.markFailed}
                        </button>
                    )}
                    {job.status === 'DONE' && (
                        <button
                            onClick={() => handleAction('output')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            <FileText className="w-3 h-3" />
                            {adminCopy.jobs.detail.actions.viewOutput}
                        </button>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-6 col-span-2">
                    {/* Error Box */}
                    {job.error && (
                        <div className="bg-red-950/30 border border-red-500/30 rounded-lg p-4">
                            <h3 className="text-red-400 font-medium mb-2 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {adminCopy.jobs.detail.error}
                            </h3>
                            <pre className="text-xs text-red-300 overflow-x-auto whitespace-pre-wrap">{job.error}</pre>
                        </div>
                    )}

                    {/* Result Box */}
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                        <h3 className="text-slate-300 font-medium mb-3">{adminCopy.jobs.detail.result}</h3>
                        <pre className="text-xs text-slate-400 font-mono overflow-x-auto max-h-96">
                            {JSON.stringify(job.result, null, 2)}
                        </pre>
                    </div>

                    {/* Loaded Output (V3) */}
                    {output && (
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 border-l-4 border-l-blue-500">
                            <h3 className="text-blue-300 font-medium mb-3">{adminCopy.jobs.detail.actions.viewOutput} (Live)</h3>
                            <pre className="text-xs text-slate-400 font-mono overflow-x-auto max-h-96">
                                {JSON.stringify(output, null, 2)}
                            </pre>
                        </div>
                    )}

                    {/* Input / Data Box */}
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                        <h3 className="text-slate-300 font-medium mb-3">{adminCopy.jobs.detail.payload}</h3>
                        <pre className="text-xs text-slate-400 font-mono overflow-x-auto max-h-96">
                            {JSON.stringify(job.payload, null, 2)}
                        </pre>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
                        <h3 className="text-slate-300 font-medium border-b border-slate-800 pb-2">{adminCopy.jobs.detail.timeline}</h3>
                        <TimelineItem label={adminCopy.jobs.table.created} date={job.createdAt} />
                        <TimelineItem label="Iniciado" date={job.startedAt} />
                        <TimelineItem label="Completado" date={job.completedAt} />
                        <div className="pt-2 border-t border-slate-800 flex justify-between text-xs">
                            <span className="text-slate-500">{adminCopy.jobs.table.duration}</span>
                            <span className="text-slate-200 font-mono">{duration}</span>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
                        <h3 className="text-slate-300 font-medium border-b border-slate-800 pb-2">Metadata</h3>
                        <MetaItem label="Type" value={job.type} />
                        <MetaItem label="Stage" value={job.stage} />
                        <MetaItem label="Attempts" value={job.attempts} />
                        <MetaItem label="Org ID" value={job.orgId} mono />
                        <MetaItem label="Project ID" value={job.projectId} mono />
                    </div>
                </div>
            </div>
        </div>
    );
}
function TimelineItem({ label, date }: { label: string, date: string | null }) {
    return (
        <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">{label}</span>
            <span className="text-slate-300 tabular-nums">
                {date ? new Date(date).toLocaleString() : '-'}
            </span>
        </div>
    );
}

function MetaItem({ label, value, mono }: { label: string, value: string | number | null, mono?: boolean }) {
    return (
        <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">{label}</span>
            <span className={`text-slate-300 ${mono ? 'font-mono' : ''} truncate max-w-[150px]`} title={String(value)}>
                {value || '-'}
            </span>
        </div>
    );
}
