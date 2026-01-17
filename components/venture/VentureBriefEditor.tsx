"use client";

import { useMemo, useState } from "react";
import { evaluateBriefQuality } from "@/lib/venture/briefQuality";

type BriefField = {
    key: string;
    label: string;
    placeholder?: string;
};

const BRIEF_FIELDS: Record<string, BriefField[]> = {
    venture_intake: [
        { key: "problem", label: "Problema" },
        { key: "targetMarket", label: "Target Market" },
        { key: "productService", label: "Producto / Servicio" },
        { key: "constraints", label: "Restricciones" },
    ],
    venture_idea_validation: [
        { key: "hypotheses", label: "Hipótesis" },
        { key: "competitors", label: "Competidores" },
        { key: "channels", label: "Canales" },
        { key: "pricingAssumptions", label: "Supuestos de pricing" },
    ],
    venture_buyer_persona: [
        { key: "personaSummary", label: "Resumen de persona" },
        { key: "pains", label: "Pains" },
        { key: "desires", label: "Deseos" },
        { key: "objections", label: "Objeciones" },
    ],
    venture_business_plan: [
        { key: "objective", label: "Objetivo" },
        { key: "revenueModel", label: "Modelo de ingresos" },
        { key: "goToMarket", label: "Go-to-market" },
        { key: "opsAssumptions", label: "Supuestos operativos" },
    ],
};

type VentureBriefEditorProps = {
    projectId: string;
    stageKey: string;
    initialBrief: Record<string, string | undefined>;
};

export function VentureBriefEditor({ projectId, stageKey, initialBrief }: VentureBriefEditorProps) {
    const fields = BRIEF_FIELDS[stageKey] || [];
    const [values, setValues] = useState<Record<string, string>>(() => {
        const mapped: Record<string, string> = {};
        for (const field of fields) {
            mapped[field.key] = initialBrief[field.key] ?? "";
        }
        return mapped;
    });
    const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

    const isDirty = useMemo(() => {
        return fields.some((field) => (initialBrief[field.key] ?? "") !== values[field.key]);
    }, [fields, initialBrief, values]);

    const quality = useMemo(() => {
        return evaluateBriefQuality(stageKey, values);
    }, [stageKey, values]);

    const handleChange = (key: string, value: string) => {
        setValues((prev) => ({ ...prev, [key]: value }));
        if (status !== "saving") setStatus("idle");
    };

    const handleSave = async () => {
        setStatus("saving");
        try {
            const res = await fetch(`/api/projects/${projectId}/stages/${stageKey}/config`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ brief: values }),
            });
            if (!res.ok) {
                throw new Error("save failed");
            }
            setStatus("saved");
        } catch {
            setStatus("error");
        }
    };

    if (!fields.length) return null;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="rounded bg-slate-800 px-2 py-1 text-slate-200">
                    Score: {quality.score}
                </span>
                {quality.missingCritical.length > 0 && (
                    <span className="text-amber-300">
                        Faltantes críticos: {quality.missingCritical.join(", ")}
                    </span>
                )}
            </div>
            {quality.suggestions.length > 0 && (
                <ul className="text-xs text-slate-400 list-disc list-inside">
                    {quality.suggestions.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            )}
            {fields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">{field.label}</label>
                    <textarea
                        value={values[field.key] ?? ""}
                        onChange={(event) => handleChange(field.key, event.target.value)}
                        placeholder={field.placeholder}
                        rows={2}
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                </div>
            ))}

            <div className="flex items-center gap-3">
                <button
                    onClick={handleSave}
                    disabled={status === "saving"}
                    className="inline-flex items-center gap-2 rounded bg-blue-500 px-3 py-1.5 text-xs font-semibold text-slate-900 disabled:opacity-60"
                >
                    {status === "saving" ? "Guardando..." : "Guardar brief"}
                </button>
                {status === "saved" && <span className="text-xs text-green-400">Guardado</span>}
                {status === "error" && <span className="text-xs text-red-400">Error al guardar</span>}
                {status === "idle" && isDirty && (
                    <span className="text-xs text-amber-300">Cambios sin guardar</span>
                )}
            </div>
        </div>
    );
}
