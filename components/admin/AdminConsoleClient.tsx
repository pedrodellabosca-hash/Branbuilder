"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProjectSelector } from "@/components/admin/ProjectSelector";
import { WhoamiDebugClient } from "@/components/admin/WhoamiDebugClient";

type Overview = {
    userId: string;
    orgId: string;
    orgSlug: string | null;
    orgRole: string;
    selectedProjectId: string | null;
    selectedProjectName: string | null;
};

type Project = {
    id: string;
    name: string;
    createdAt: string;
};

type ProviderFlags = {
    openai: boolean;
    anthropic: boolean;
    mock: boolean;
};

type AiConfig = {
    org: { stageConfigs: unknown; providerFlags: ProviderFlags; available: boolean };
    project: { stageConfigs: unknown; providerFlags: ProviderFlags; available: boolean } | null;
};

type Model = {
    id: string;
    provider: string;
    modelKey: string;
    status: string;
    capabilities?: unknown;
    lastSeenAt?: string | null;
};

type Recommendation = {
    id: string;
    stageKey: string;
    recommendedModelKey: string;
    fallbackModelKey: string | null;
    scope: string;
};

type Job = {
    id: string;
    status: string;
    stageKey: string;
    projectId: string;
    projectName: string | null;
    createdAt: string;
};

async function fetchJson<T>(url: string): Promise<T> {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
    }
    return res.json();
}

function parseStageConfigs(input: unknown) {
    if (!input || typeof input !== "object") return null;
    return input as Record<string, unknown>;
}

export function AdminConsoleClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedProjectId = searchParams.get("projectId") ?? "";

    const [overview, setOverview] = useState<Overview | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);
    const [models, setModels] = useState<Model[]>([]);
    const [modelsNotAvailable, setModelsNotAvailable] = useState(false);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [recommendationsNotAvailable, setRecommendationsNotAvailable] = useState(false);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [providerFilter, setProviderFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    useEffect(() => {
        fetchJson<{ projects: Project[] }>("/api/admin/projects")
            .then((data) => setProjects(data.projects))
            .catch((err) => setError(err instanceof Error ? err.message : "Failed to load projects"));
    }, []);

    useEffect(() => {
        const query = selectedProjectId ? `?projectId=${selectedProjectId}` : "";
        Promise.all([
            fetchJson<Overview>(`/api/admin/overview${query}`),
            fetchJson<AiConfig>(`/api/admin/ai-config${query}`),
            fetchJson<{ models: Model[]; notAvailable?: boolean }>(`/api/admin/models`),
            fetchJson<{ merged: Recommendation[]; notAvailable?: boolean }>(`/api/admin/recommendations${query}`),
            fetchJson<{ jobs: Job[] }>(`/api/admin/jobs${query}`),
        ])
            .then(([overviewData, aiData, modelsData, recData, jobsData]) => {
                setError(null);
                setOverview(overviewData);
                setAiConfig(aiData);
                setModels(modelsData.models);
                setModelsNotAvailable(!!modelsData.notAvailable);
                setRecommendations(recData.merged);
                setRecommendationsNotAvailable(!!recData.notAvailable);
                setJobs(jobsData.jobs);
            })
            .catch((err) => {
                setError(err instanceof Error ? err.message : "Failed to load admin data");
            });
    }, [selectedProjectId]);

    const filteredModels = useMemo(() => {
        return models.filter((model) => {
            if (providerFilter !== "all" && model.provider !== providerFilter) return false;
            if (statusFilter !== "all" && model.status !== statusFilter) return false;
            return true;
        });
    }, [models, providerFilter, statusFilter]);

    const orgStageConfigs = parseStageConfigs(aiConfig?.org.stageConfigs);
    const projectStageConfigs = parseStageConfigs(aiConfig?.project?.stageConfigs ?? null);

    const overrideKeys = useMemo(() => {
        if (!orgStageConfigs || !projectStageConfigs) return [];
        return Object.keys(projectStageConfigs);
    }, [orgStageConfigs, projectStageConfigs]);

    const handleProjectChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (!value) {
            params.delete("projectId");
        } else {
            params.set("projectId", value);
        }
        router.replace(`/admin?${params.toString()}`);
    };

    return (
        <div className="space-y-10">
            <header className="space-y-4">
                <div>
                    <h1 className="text-2xl font-semibold">Admin access OK</h1>
                    <p className="text-sm text-slate-400">Organization-level AI governance & ops</p>
                </div>

                <div className="flex flex-wrap gap-4 text-sm">
                    <a className="text-blue-400 underline" href="/admin/ai">/admin/ai</a>
                    <a className="text-blue-400 underline" href="/admin/registry">/admin/registry</a>
                    <a className="text-blue-400 underline" href="/admin/ops">/admin/ops</a>
                </div>

                {overview && (
                    <div className="rounded border border-slate-800 bg-slate-900 p-4 text-sm text-slate-200">
                        <div>Org: {overview.orgSlug ?? "n/a"} ({overview.orgId})</div>
                        <div>Role: {overview.orgRole}</div>
                        <div>User: {overview.userId}</div>
                        {overview.selectedProjectId && (
                            <div>Project: {overview.selectedProjectName} ({overview.selectedProjectId})</div>
                        )}
                    </div>
                )}

                <ProjectSelector
                    projects={projects}
                    selectedProjectId={selectedProjectId}
                    onChange={handleProjectChange}
                />

                {error && (
                    <div className="rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                        {error}
                    </div>
                )}
            </header>

            <section className="space-y-4">
                <h2 className="text-lg font-semibold">AI Governance</h2>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded border border-slate-800 bg-slate-900 p-4">
                        <h3 className="text-sm font-semibold uppercase text-slate-400">Providers</h3>
                        {aiConfig ? (
                            <div className="mt-3 space-y-2 text-sm">
                                {Object.entries(aiConfig.org.providerFlags).map(([key, value]) => (
                                    <div key={key} className="flex items-center justify-between">
                                        <span>{key}</span>
                                        <span className={value ? "text-green-400" : "text-slate-500"}>
                                            {value ? "configured" : "not configured"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500">Loading...</p>
                        )}
                    </div>

                    <div className="rounded border border-slate-800 bg-slate-900 p-4">
                        <h3 className="text-sm font-semibold uppercase text-slate-400">Stage Configs</h3>
                        <div className="mt-3 space-y-3 text-sm">
                            <div>
                                <div className="text-slate-300">Organization</div>
                                {aiConfig?.org.available ? (
                                    <pre className="mt-2 max-h-48 overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-200">
                                        {JSON.stringify(aiConfig.org.stageConfigs, null, 2)}
                                    </pre>
                                ) : (
                                    <p className="text-slate-500">Not available in this schema.</p>
                                )}
                            </div>
                            {selectedProjectId && (
                                <div>
                                    <div className="text-slate-300">Project override</div>
                                    {aiConfig?.project?.available ? (
                                        <pre className="mt-2 max-h-48 overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-200">
                                            {JSON.stringify(aiConfig.project.stageConfigs, null, 2)}
                                        </pre>
                                    ) : (
                                        <p className="text-slate-500">Not available in this schema.</p>
                                    )}
                                    {overrideKeys.length > 0 && (
                                        <p className="mt-2 text-xs text-slate-400">
                                            Override present for: {overrideKeys.join(", ")}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="rounded border border-slate-800 bg-slate-900 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-sm font-semibold uppercase text-slate-400">Model Catalog</h3>
                        <select
                            className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                            value={providerFilter}
                            onChange={(event) => setProviderFilter(event.target.value)}
                        >
                            <option value="all">All providers</option>
                            {Array.from(new Set(models.map((m) => m.provider))).map((provider) => (
                                <option key={provider} value={provider}>{provider}</option>
                            ))}
                        </select>
                        <select
                            className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value)}
                        >
                            <option value="all">All status</option>
                            {Array.from(new Set(models.map((m) => m.status))).map((status) => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </div>
                    {modelsNotAvailable ? (
                        <p className="mt-3 text-sm text-slate-500">Model catalog not available in this schema.</p>
                    ) : (
                        <div className="mt-3 overflow-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs uppercase text-slate-500">
                                    <tr>
                                        <th className="py-2">Provider</th>
                                        <th className="py-2">Model</th>
                                        <th className="py-2">Status</th>
                                        <th className="py-2">Last Seen</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredModels.map((model) => (
                                        <tr key={model.id} className="border-t border-slate-800">
                                            <td className="py-2">{model.provider}</td>
                                            <td className="py-2">{model.modelKey}</td>
                                            <td className="py-2">{model.status}</td>
                                            <td className="py-2">
                                                {model.lastSeenAt ? new Date(model.lastSeenAt).toLocaleString() : "n/a"}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredModels.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-3 text-slate-500">
                                                No models match the filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="rounded border border-slate-800 bg-slate-900 p-4">
                    <h3 className="text-sm font-semibold uppercase text-slate-400">Stage Model Recommendations</h3>
                    {recommendationsNotAvailable ? (
                        <p className="mt-3 text-sm text-slate-500">Recommendations not available in this schema.</p>
                    ) : (
                        <div className="mt-3 overflow-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs uppercase text-slate-500">
                                    <tr>
                                        <th className="py-2">Stage</th>
                                        <th className="py-2">Recommended</th>
                                        <th className="py-2">Fallback</th>
                                        <th className="py-2">Scope</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recommendations.map((rec) => (
                                        <tr key={rec.id} className="border-t border-slate-800">
                                            <td className="py-2">{rec.stageKey}</td>
                                            <td className="py-2">{rec.recommendedModelKey}</td>
                                            <td className="py-2">{rec.fallbackModelKey ?? "—"}</td>
                                            <td className="py-2">{rec.scope}</td>
                                        </tr>
                                    ))}
                                    {recommendations.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-3 text-slate-500">
                                                No recommendations found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-lg font-semibold">Ops</h2>
                <div className="rounded border border-slate-800 bg-slate-900 p-4">
                    <h3 className="text-sm font-semibold uppercase text-slate-400">Recent Jobs</h3>
                    <div className="mt-3 overflow-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="py-2">Status</th>
                                    <th className="py-2">Stage</th>
                                    <th className="py-2">Project</th>
                                    <th className="py-2">Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {jobs.map((job) => (
                                    <tr key={job.id} className="border-t border-slate-800">
                                        <td className="py-2">{job.status}</td>
                                        <td className="py-2">{job.stageKey}</td>
                                        <td className="py-2">{job.projectName ?? job.projectId}</td>
                                        <td className="py-2">{new Date(job.createdAt).toLocaleString()}</td>
                                    </tr>
                                ))}
                                {jobs.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="py-3 text-slate-500">
                                            No recent jobs found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-lg font-semibold">Whoami Debug</h2>
                <WhoamiDebugClient />
            </section>
        </div>
    );
}
