"use client";

import { useMemo, useState } from "react";

type Project = {
    id: string;
    name: string;
    createdAt: string;
};

type ProjectSelectorProps = {
    projects: Project[];
    selectedProjectId: string;
    onChange: (value: string) => void;
};

export function ProjectSelector({ projects, selectedProjectId, onChange }: ProjectSelectorProps) {
    const [filter, setFilter] = useState("");

    const filtered = useMemo(() => {
        if (!filter.trim()) return projects;
        const lower = filter.toLowerCase();
        return projects.filter((project) =>
            project.name.toLowerCase().includes(lower) || project.id.toLowerCase().includes(lower)
        );
    }, [filter, projects]);

    return (
        <div className="rounded border border-slate-800 bg-slate-900 p-4">
            <div className="text-sm font-semibold uppercase text-slate-400">Project selector</div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
                <input
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                    placeholder="Search by project name or id"
                    className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
                <select
                    value={selectedProjectId}
                    onChange={(event) => onChange(event.target.value)}
                    className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                >
                    <option value="">All projects</option>
                    {filtered.map((project) => (
                        <option key={project.id} value={project.id}>
                            {project.name} ({project.id.slice(0, 6)}…)
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
