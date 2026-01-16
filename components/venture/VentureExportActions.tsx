"use client";

import { useState } from "react";

type VentureExportActionsProps = {
    projectId: string;
};

export function VentureExportActions({ projectId }: VentureExportActionsProps) {
    const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const [version, setVersion] = useState<number | null>(null);

    const handleSave = async () => {
        setStatus("saving");
        setVersion(null);
        try {
            const res = await fetch(`/api/projects/${projectId}/venture/export/save`, {
                method: "POST",
            });
            if (!res.ok) {
                throw new Error("save failed");
            }
            const data = await res.json();
            setVersion(data.version ?? null);
            setStatus("saved");
        } catch {
            setStatus("error");
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-3">
            <button
                onClick={handleSave}
                disabled={status === "saving"}
                className="inline-flex items-center gap-2 rounded bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-60"
            >
                {status === "saving" ? "Guardando..." : "Guardar en Library"}
            </button>
            {status === "saved" && (
                <span className="text-xs text-green-400">
                    Guardado{version ? ` (v${version})` : ""}
                </span>
            )}
            {status === "error" && <span className="text-xs text-red-400">Error al guardar</span>}
        </div>
    );
}
