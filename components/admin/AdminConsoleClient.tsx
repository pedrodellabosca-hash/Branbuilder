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

type FetchResult<T> = {
    ok: boolean;
    status: number;
    data: T | null;
};

async function fetchWithStatus<T>(url: string): Promise<FetchResult<T>> {
    const res = await fetch(url, { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as T | null;
    return { ok: res.ok, status: res.status, data };
}

function getProjectError(status: number) {
    if (status === 400) return "projectId required";
    if (status === 404) return "Project not found for this org";
    return "Failed to load project-scoped data";
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
    const [overviewError, setOverviewError] = useState<string | null>(null);
    const [aiConfigError, setAiConfigError] = useState<string | null>(null);
    const [recommendationsError, setRecommendationsError] = useState<string | null>(null);
    const [jobsError, setJobsError] = useState<string | null>(null);

    const [providerFilter, setProviderFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    useEffect(() => {
        fetchWithStatus<{ projects: Project[] }>("/api/admin/projects")
            .then((result) => {
                if (result.ok && result.data) {
                    setProjects(result.data.projects);
                    return;
                }
                setError(result.status === 403 ? "Forbidden" : "Failed to load projects");
            })
            .catch((err) => setError(err instanceof Error ? err.message : "Failed to load projects"));
    }, []);

    useEffect(() => {
        const query = selectedProjectId ? `?projectId=${selectedProjectId}` : "";

        fetchWithStatus<Overview>(`/api/admin/overview${query}`).then((result) => {
            if (result.ok && result.data) {
                setOverview(result.data);
                setOverviewError(null);
            } else {
                setOverview(null);
                setOverviewError(result.status === 404 ? "Project not found for this org" : "Failed to load overview");
            }
        }).catch((err) => {
            setOverview(null);
            setOverviewError(err instanceof Error ? err.message : "Failed to load overview");
        });

        fetchWithStatus<{ models: Model[]; notAvailable?: boolean }>("/api/admin/models")
            .then((result) => {
                if (result.ok && result.data) {
                    setModels(result.data.models);
                    setModelsNotAvailable(!!result.data.notAvailable);
                    return;
                }
                setModels([]);
                setModelsNotAvailable(false);
                setError(result.status === 403 ? "Forbidden" : "Failed to load models");
            })
            .catch((err) => setError(err instanceof Error ? err.message : "Failed to load models"));

        if (!selectedProjectId) {
            setAiConfig(null);
            setRecommendations([]);
            setJobs([]);
            setAiConfigError("Select a project");
            setRecommendationsError("Select a project");
            setJobsError("Select a project");
            return;
        }

        fetchWithStatus<AiConfig>(`/api/admin/ai-config${query}`).then((result) => {
            if (result.ok && result.data) {
                setAiConfig(result.data);
                setAiConfigError(null);
            } else {
                setAiConfig(null);
                setAiConfigError(getProjectError(result.status));
            }
        }).catch((err) => {
            setAiConfig(null);
            setAiConfigError(err instanceof Error ? err.message : "Failed to load AI config");
        });

        fetchWithStatus<{ merged: Recommendation[]; notAvailable?: boolean }>(`/api/admin/recommendations${query}`)
            .then((result) => {
                if (result.ok && result.data) {
                    setRecommendations(result.data.merged);
                    setRecommendationsNotAvailable(!!result.data.notAvailable);
                    setRecommendationsError(null);
                } else {
                    setRecommendations([]);
                    setRecommendationsNotAvailable(false);
                    setRecommendationsError(getProjectError(result.status));
                }
            })
            .catch((err) => {
                setRecommendations([]);
                setRecommendationsError(err instanceof Error ? err.message : "Failed to load recommendations");
            });

        fetchWithStatus<{ jobs: Job[] }>(`/api/admin/jobs${query}`)
            .then((result) => {
                if (result.ok && result.data) {
                    setJobs(result.data.jobs);
                    setJobsError(null);
                } else {
                    setJobs([]);
                    setJobsError(getProjectError(result.status));
                }
            })
            .catch((err) => {
                setJobs([]);
                setJobsError(err instanceof Error ? err.message : "Failed to load jobs");
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

                {(error || overviewError) && (
                    <div className="rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                        {error ?? overviewError}
                    </div>
                )}
            </header>

            <section className="space-y-4">
                <h2 className="text-lg font-semibold">AI Governance</h2>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded border border-slate-800 bg-slate-900 p-4">
                        <h3 className="text-sm font-semibold uppercase text-slate-400">Providers</h3>
                        {aiConfigError ? (
                            <p className="mt-3 text-sm text-slate-500">{aiConfigError}</p>
                        ) : aiConfig ? (
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
                                {aiConfigError ? (
                                    <p className="text-slate-500">{aiConfigError}</p>
                                ) : aiConfig?.org.available ? (
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
                                    {aiConfigError ? (
                                        <p className="text-slate-500">{aiConfigError}</p>
                                    ) : aiConfig?.project?.available ? (
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
                    {recommendationsError ? (
                        <p className="mt-3 text-sm text-slate-500">{recommendationsError}</p>
                    ) : recommendationsNotAvailable ? (
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
                    {jobsError && (
                        <p className="mt-3 text-sm text-slate-500">{jobsError}</p>
                    )}
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
