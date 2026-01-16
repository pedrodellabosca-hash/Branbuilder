import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Palette,
    LineChart,
    Settings,
    Play,
    CheckCircle,
    Circle,
    ChevronRight,
    Lightbulb,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { ProjectFiles } from "@/components/project/ProjectFiles";
import { getNextVentureStage } from "@/lib/venture/getNextVentureStage";
import { VentureExportActions } from "@/components/venture/VentureExportActions";

// Force dynamic rendering
export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ id: string }>;
}

async function getProjectWithDetails(projectId: string, clerkOrgId: string) {
    // First get the org to verify multi-tenant access
    const org = await prisma.organization.findUnique({
        where: { clerkOrgId },
    });

    if (!org) {
        return null;
    }

    // Get project with stages - filtered by orgId (multi-tenant)
    const project = await prisma.project.findFirst({
        where: {
            id: projectId,
            orgId: org.id, // Multi-tenant isolation
            status: { not: "DELETED" },
        },
        include: {
            stages: {
                orderBy: { order: "asc" },
            },
            brandCore: true,
            library: {
                where: { status: { not: "DELETED" } },
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    filename: true,
                    originalName: true,
                    mimeType: true,
                    size: true,
                    status: true,
                    uploadedBy: true,
                    createdAt: true,
                },
            },
            _count: {
                select: {
                    members: true,
                    outputs: true,
                    library: true,
                },
            },
        },
    });

    return project;
}

export default async function ProjectDetailPage({ params }: PageProps) {
    const { userId, orgId } = await auth();
    const { id: projectId } = await params;

    if (!userId) {
        redirect("/sign-in");
    }

    if (!orgId) {
        redirect("/projects");
    }

    const project = await getProjectWithDetails(projectId, orgId);

    if (!project) {
        notFound();
    }

    const moduleAStages = project.stages.filter((s) => s.module === "A");
    const moduleBStages = project.stages.filter((s) => s.module === "B");

    const ventureStageConfig = [
        { key: "venture_intake", label: "Intake" },
        { key: "venture_idea_validation", label: "Validación de idea" },
        { key: "venture_buyer_persona", label: "Buyer Persona" },
        { key: "venture_business_plan", label: "Business Plan" },
    ];

    const ventureStages = ventureStageConfig
        .map((config) => ({
            config,
            stage: project.stages.find((stage) => stage.stageKey === config.key),
        }))
        .filter((entry) => entry.stage);

    const ventureNext = ventureStages.length > 0 ? await getNextVentureStage(project.id) : null;

    const statusLabels: Record<string, string> = {
        NOT_STARTED: "No iniciado",
        GENERATED: "Generado",
        APPROVED: "Aprobado",
        REGENERATED: "Regenerado",
        BLOCKED: "Bloqueado",
    };

    const statusIcons: Record<string, typeof Circle> = {
        NOT_STARTED: Circle,
        GENERATED: Play,
        APPROVED: CheckCircle,
        REGENERATED: Play,
        BLOCKED: Circle,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <Link
                    href="/projects"
                    className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors w-fit"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Volver a proyectos
                </Link>

                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                            {project.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
                            {project.description && (
                                <p className="text-slate-400 mt-1">{project.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                                {project.moduleA && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs font-medium">
                                        <Palette className="w-3 h-3" />
                                        Módulo A
                                    </span>
                                )}
                                {project.moduleB && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/10 text-purple-400 rounded text-xs font-medium">
                                        <LineChart className="w-3 h-3" />
                                        Módulo B
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors">
                        <Settings className="w-4 h-4" />
                        Configuración
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <p className="text-sm text-slate-400">Etapas</p>
                    <p className="text-2xl font-bold text-white">{project.stages.length}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <p className="text-sm text-slate-400">Outputs</p>
                    <p className="text-2xl font-bold text-white">{project._count.outputs}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <p className="text-sm text-slate-400">Miembros</p>
                    <p className="text-2xl font-bold text-white">{project._count.members}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <p className="text-sm text-slate-400">Archivos</p>
                    <p className="text-2xl font-bold text-white">{project._count.library}</p>
                </div>
            </div>

            {/* Stages by Module */}
            <div className="grid gap-6 lg:grid-cols-2">
                {ventureStages.length > 0 && (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl lg:col-span-2">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800">
                            <Lightbulb className="w-5 h-5 text-amber-400" />
                            <h2 className="text-lg font-semibold text-white">
                                Fundamentos del negocio
                            </h2>
                        </div>
                        <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap items-center gap-3">
                            {ventureNext?.nextStageKey ? (
                                <Link
                                    href={`/projects/${project.id}/stages/${ventureNext.nextStageKey}`}
                                    className="inline-flex items-center gap-2 rounded bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-900"
                                >
                                    Continuar con el siguiente paso recomendado
                                </Link>
                            ) : (
                                <span
                                    className={`text-xs font-semibold px-3 py-1.5 rounded ${ventureNext?.doneApproved
                                        ? "bg-green-500/10 text-green-400"
                                        : "bg-amber-500/10 text-amber-300"
                                        }`}
                                >
                                    Fundamentos completos
                                </span>
                            )}
                            <Link
                                href={`/api/projects/${project.id}/venture/export`}
                                className="inline-flex items-center gap-2 rounded bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                            >
                                Exportar Fundamentos (MD)
                            </Link>
                            <Link
                                href={`/api/projects/${project.id}/venture/export/pdf`}
                                className="inline-flex items-center gap-2 rounded bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                            >
                                Exportar Fundamentos (PDF)
                            </Link>
                            <Link
                                href={`/api/projects/${project.id}/venture/export/bundle`}
                                className="inline-flex items-center gap-2 rounded bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                            >
                                Descargar paquete (ZIP)
                            </Link>
                            <VentureExportActions projectId={project.id} />
                        </div>
                        <div className="divide-y divide-slate-800">
                            {ventureStages.map(({ config, stage }) => {
                                const status = stage?.status ?? "NOT_STARTED";
                                const StatusIcon = statusIcons[status] || Circle;
                                return (
                                    <Link
                                        key={config.key}
                                        href={`/projects/${project.id}/stages/${config.key}`}
                                        className="flex items-center justify-between px-5 py-3 hover:bg-slate-800/50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <StatusIcon
                                                className={`w-4 h-4 ${status === "APPROVED"
                                                    ? "text-green-500"
                                                    : status === "NOT_STARTED"
                                                        ? "text-slate-500"
                                                        : "text-amber-400"
                                                    }`}
                                            />
                                            <div>
                                                <p className="text-sm font-medium text-white group-hover:text-amber-300 transition-colors">
                                                    {config.label}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`text-xs px-2 py-1 rounded ${status === "APPROVED"
                                                    ? "bg-green-500/10 text-green-400"
                                                    : status === "NOT_STARTED"
                                                        ? "bg-slate-500/10 text-slate-400"
                                                        : "bg-amber-500/10 text-amber-300"
                                                    }`}
                                            >
                                                {statusLabels[status] || status}
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Module A */}
                {project.moduleA && moduleAStages.length > 0 && (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800">
                            <Palette className="w-5 h-5 text-blue-500" />
                            <h2 className="text-lg font-semibold text-white">
                                Módulo A: Creación de Marca
                            </h2>
                        </div>
                        <div className="divide-y divide-slate-800">
                            {moduleAStages.map((stage) => {
                                const StatusIcon = statusIcons[stage.status] || Circle;
                                return (
                                    <Link
                                        key={stage.id}
                                        href={`/projects/${project.id}/stages/${stage.stageKey}`}
                                        className="flex items-center justify-between px-5 py-3 hover:bg-slate-800/50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <StatusIcon
                                                className={`w-4 h-4 ${stage.status === "APPROVED"
                                                    ? "text-green-500"
                                                    : stage.status === "NOT_STARTED"
                                                        ? "text-slate-500"
                                                        : "text-blue-500"
                                                    }`}
                                            />
                                            <div>
                                                <p className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                                                    {stage.displayKey || stage.stageKey}. {stage.name}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`text-xs px-2 py-1 rounded ${stage.status === "APPROVED"
                                                    ? "bg-green-500/10 text-green-400"
                                                    : stage.status === "NOT_STARTED"
                                                        ? "bg-slate-500/10 text-slate-400"
                                                        : "bg-blue-500/10 text-blue-400"
                                                    }`}
                                            >
                                                {statusLabels[stage.status] || stage.status}
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Module B */}
                {project.moduleB && moduleBStages.length > 0 && (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800">
                            <LineChart className="w-5 h-5 text-purple-500" />
                            <h2 className="text-lg font-semibold text-white">
                                Módulo B: Brand Strategy
                            </h2>
                        </div>
                        <div className="divide-y divide-slate-800">
                            {moduleBStages.map((stage) => {
                                const StatusIcon = statusIcons[stage.status] || Circle;
                                return (
                                    <Link
                                        key={stage.id}
                                        href={`/projects/${project.id}/stages/${stage.stageKey}`}
                                        className="flex items-center justify-between px-5 py-3 hover:bg-slate-800/50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <StatusIcon
                                                className={`w-4 h-4 ${stage.status === "APPROVED"
                                                    ? "text-green-500"
                                                    : stage.status === "NOT_STARTED"
                                                        ? "text-slate-500"
                                                        : "text-purple-500"
                                                    }`}
                                            />
                                            <div>
                                                <p className="text-sm font-medium text-white group-hover:text-purple-400 transition-colors">
                                                    {stage.displayKey || stage.stageKey}. {stage.name}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`text-xs px-2 py-1 rounded ${stage.status === "APPROVED"
                                                    ? "bg-green-500/10 text-green-400"
                                                    : stage.status === "NOT_STARTED"
                                                        ? "bg-slate-500/10 text-slate-400"
                                                        : "bg-purple-500/10 text-purple-400"
                                                    }`}
                                            >
                                                {statusLabels[stage.status] || stage.status}
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Project Files */}
            <ProjectFiles
                projectId={project.id}
                initialFiles={project.library.map((f) => ({
                    ...f,
                    createdAt: f.createdAt.toISOString(),
                }))}
            />
        </div>
    );
}
