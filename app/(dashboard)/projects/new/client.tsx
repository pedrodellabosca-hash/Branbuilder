"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@clerk/nextjs";
import {
    ArrowLeft,
    Palette,
    LineChart,
    Check,
    Loader2,
    AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ModuleOption {
    id: "A" | "B";
    name: string;
    description: string;
    icon: React.ElementType;
    features: string[];
    color: string;
}

const modules: ModuleOption[] = [
    {
        id: "A",
        name: "Creación de Marca",
        description: "Naming, identidad visual, manifiesto y aplicaciones",
        icon: Palette,
        features: [
            "Contexto y posicionamiento",
            "Naming estratégico",
            "Manifiesto y narrativa",
            "Sistema de identidad visual",
            "Aplicaciones de marca",
            "Brand Pack final",
        ],
        color: "blue",
    },
    {
        id: "B",
        name: "Brand Strategy",
        description: "Estrategia de marca con sistema multi-agente",
        icon: LineChart,
        features: [
            "Briefing estratégico",
            "Consumer insights",
            "Análisis competitivo",
            "Cascada de elecciones (CSO)",
            "Métricas de marca",
            "Strategy Pack final",
        ],
        color: "purple",
    },
];

export default function NewProjectClient() {
    const router = useRouter();
    const { organization } = useOrganization();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [language, setLanguage] = useState<"ES" | "EN">("ES");
    const [selectedModules, setSelectedModules] = useState<Set<"A" | "B">>(
        new Set()
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleModule = (moduleId: "A" | "B") => {
        const newSet = new Set(selectedModules);
        if (newSet.has(moduleId)) {
            newSet.delete(moduleId);
        } else {
            newSet.add(moduleId);
        }
        setSelectedModules(newSet);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!name.trim()) {
            setError("El nombre del proyecto es requerido");
            return;
        }

        if (selectedModules.size === 0) {
            setError("Debes seleccionar al menos un módulo");
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim() || null,
                    language,
                    moduleA: selectedModules.has("A"),
                    moduleB: selectedModules.has("B"),
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Error al crear el proyecto");
            }

            const project = await response.json();
            router.push(`/projects/${project.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error desconocido");
            setIsSubmitting(false);
        }
    };

    if (!organization) {
        return null;
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Volver al dashboard
                </Link>
                <h1 className="text-2xl font-bold text-white">Nuevo Proyecto</h1>
                <p className="text-slate-400">
                    Crea un nuevo proyecto de marca para tu organización
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Error message */}
                {error && (
                    <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                {/* Basic Info */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                    <h2 className="text-lg font-semibold text-white">
                        Información básica
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label
                                htmlFor="name"
                                className="block text-sm font-medium text-slate-300 mb-2"
                            >
                                Nombre del proyecto *
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Mi marca increíble"
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="description"
                                className="block text-sm font-medium text-slate-300 mb-2"
                            >
                                Descripción (opcional)
                            </label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe brevemente el propósito de este proyecto..."
                                rows={3}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Idioma del proyecto
                            </label>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setLanguage("ES")}
                                    className={cn(
                                        "flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-colors",
                                        language === "ES"
                                            ? "bg-blue-600 border-blue-600 text-white"
                                            : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600"
                                    )}
                                >
                                    🇪🇸 Español
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLanguage("EN")}
                                    className={cn(
                                        "flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-colors",
                                        language === "EN"
                                            ? "bg-blue-600 border-blue-600 text-white"
                                            : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600"
                                    )}
                                >
                                    🇬🇧 English
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Module Selection */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold text-white">
                            Selecciona los módulos *
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">
                            Puedes habilitar uno o ambos módulos según tus necesidades
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        {modules.map((module) => {
                            const isSelected = selectedModules.has(module.id);
                            const Icon = module.icon;
                            const colorClasses =
                                module.color === "blue"
                                    ? {
                                        border: isSelected
                                            ? "border-blue-500"
                                            : "border-slate-700 hover:border-slate-600",
                                        bg: isSelected ? "bg-blue-500/10" : "",
                                        iconBg: "bg-blue-500/10",
                                        iconColor: "text-blue-500",
                                        checkBg: "bg-blue-500",
                                    }
                                    : {
                                        border: isSelected
                                            ? "border-purple-500"
                                            : "border-slate-700 hover:border-slate-600",
                                        bg: isSelected ? "bg-purple-500/10" : "",
                                        iconBg: "bg-purple-500/10",
                                        iconColor: "text-purple-500",
                                        checkBg: "bg-purple-500",
                                    };

                            return (
                                <button
                                    key={module.id}
                                    type="button"
                                    onClick={() => toggleModule(module.id)}
                                    className={cn(
                                        "relative p-6 rounded-xl border text-left transition-all",
                                        colorClasses.border,
                                        colorClasses.bg
                                    )}
                                >
                                    {/* Check indicator */}
                                    {isSelected && (
                                        <div
                                            className={cn(
                                                "absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center",
                                                colorClasses.checkBg
                                            )}
                                        >
                                            <Check className="w-4 h-4 text-white" />
                                        </div>
                                    )}

                                    {/* Icon */}
                                    <div
                                        className={cn(
                                            "w-12 h-12 rounded-lg flex items-center justify-center mb-4",
                                            colorClasses.iconBg
                                        )}
                                    >
                                        <Icon className={cn("w-6 h-6", colorClasses.iconColor)} />
                                    </div>

                                    {/* Content */}
                                    <h3 className="text-lg font-semibold text-white mb-1">
                                        Módulo {module.id}: {module.name}
                                    </h3>
                                    <p className="text-sm text-slate-400 mb-4">
                                        {module.description}
                                    </p>

                                    {/* Features */}
                                    <ul className="space-y-2">
                                        {module.features.map((feature) => (
                                            <li
                                                key={feature}
                                                className="flex items-center gap-2 text-sm text-slate-300"
                                            >
                                                <div
                                                    className={cn(
                                                        "w-1.5 h-1.5 rounded-full",
                                                        module.color === "blue"
                                                            ? "bg-blue-500"
                                                            : "bg-purple-500"
                                                    )}
                                                />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Submit */}
                <div className="flex items-center justify-end gap-4">
                    <Link
                        href="/"
                        className="px-6 py-3 text-slate-300 hover:text-white transition-colors"
                    >
                        Cancelar
                    </Link>
                    <button
                        type="submit"
                        disabled={isSubmitting || selectedModules.size === 0}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors",
                            isSubmitting || selectedModules.size === 0
                                ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                        )}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Creando...
                            </>
                        ) : (
                            "Crear Proyecto"
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
