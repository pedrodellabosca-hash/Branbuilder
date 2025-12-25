import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Palette, LineChart, Play, CheckCircle, Circle } from "lucide-react";
import { prisma } from "@/lib/db";
import { StageActions } from "@/components/project/StageActions";

// Force dynamic rendering
export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ id: string; stageId: string }>;
    searchParams: Promise<{ jobId?: string }>;
}

async function getStageWithProject(
    stageId: string,
    projectId: string,
    clerkOrgId: string
) {
    // Get org for multi-tenant validation
    const org = await prisma.organization.findUnique({
        where: { clerkOrgId },
    });

    if (!org) {
        return null;
    }

    // Get stage with project - multi-tenant check via project.orgId
    const stage = await prisma.stage.findFirst({
        where: {
            id: stageId,
            projectId,
            project: {
                orgId: org.id,
                status: { not: "DELETED" },
            },
        },
        include: {
            project: {
                select: {
                    id: true,
                    name: true,
                    orgId: true,
                },
            },
            outputs: {
                orderBy: { createdAt: "desc" },
                take: 5,
                include: {
                    versions: {
                        orderBy: { version: "desc" },
                        take: 1,
                    },
                },
            },
        },
    });

    return stage;
}

async function getJobStatus(jobId: string, orgId: string) {
    const org = await prisma.organization.findUnique({
        where: { clerkOrgId: orgId },
    });

    if (!org) return null;

    const job = await prisma.job.findFirst({
        where: {
            id: jobId,
            orgId: org.id,
        },
        select: {
            id: true,
            status: true,
            progress: true,
            error: true,
            result: true,
        },
    });

    return job;
}

export default async function StageDetailPage({ params, searchParams }: PageProps) {
    const { userId, orgId } = await auth();
    const { id: projectId, stageId } = await params;
    const { jobId: jobIdParam } = await searchParams;

    if (!userId) {
        redirect("/sign-in");
    }

    if (!orgId) {
        redirect("/projects");
    }

    const stage = await getStageWithProject(stageId, projectId, orgId);

    if (!stage) {
        notFound();
    }

    // Get job status if jobId is in query
    let jobStatus: string | undefined;
    if (jobIdParam) {
        const job = await getJobStatus(jobIdParam, orgId);
        if (job) {
            jobStatus = job.status;
        }
    }

    const statusLabels: Record<string, string> = {
        NOT_STARTED: "No iniciado",
        GENERATED: "Generado",
        APPROVED: "Aprobado",
        REGENERATED: "Regenerado",
        BLOCKED: "Bloqueado",
    };

    const statusColors: Record<string, string> = {
        NOT_STARTED: "bg-slate-500",
        GENERATED: "bg-blue-500",
        APPROVED: "bg-green-500",
        REGENERATED: "bg-purple-500",
        BLOCKED: "bg-red-500",
    };

    const ModuleIcon = stage.module === "A" ? Palette : LineChart;
    const moduleColor = stage.module === "A" ? "text-blue-500" : "text-purple-500";
    const moduleName = stage.module === "A" ? "Creación de Marca" : "Brand Strategy";

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <Link
                    href={`/projects/${projectId}`}
                    className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors w-fit"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Volver al proyecto
                </Link>

                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <ModuleIcon className={`w-5 h-5 ${moduleColor}`} />
                            <span className="text-sm text-slate-400">
                                Módulo {stage.module}: {moduleName}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold text-white">
                            {stage.stageKey}. {stage.name}
                        </h1>
                        {stage.description && (
                            <p className="text-slate-400 mt-2">{stage.description}</p>
                        )}
                    </div>
                    <span
                        className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium text-white ${statusColors[stage.status]}`}
                    >
                        {statusLabels[stage.status] || stage.status}
                    </span>
                </div>
            </div>

            {/* Actions Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Acciones</h2>
                <StageActions
                    projectId={projectId}
                    stageId={stageId}
                    stageKey={stage.stageKey}
                    module={stage.module as "A" | "B"}
                    status={stage.status}
                    initialJobId={jobIdParam}
                    initialJobStatus={jobStatus}
                />
            </div>

            {/* Outputs */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl">
                <div className="px-6 py-4 border-b border-slate-800">
                    <h2 className="text-lg font-semibold text-white">
                        Outputs ({stage.outputs.length})
                    </h2>
                </div>
                {stage.outputs.length === 0 ? (
                    <div className="p-6 text-center">
                        <p className="text-slate-400">
                            No hay outputs generados aún. Haz clic en &quot;Generar&quot; para crear el contenido de esta etapa.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-800">
                        {stage.outputs.map((output) => {
                            const latestVersion = output.versions[0];
                            return (
                                <div
                                    key={output.id}
                                    className="px-6 py-4 hover:bg-slate-800/50 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-white">{output.name}</p>
                                            <p className="text-sm text-slate-400">
                                                {output.outputKey}
                                                {latestVersion && ` • v${latestVersion.version}`}
                                            </p>
                                        </div>
                                        {latestVersion && (
                                            <span
                                                className={`text-xs px-2 py-1 rounded ${latestVersion.status === "APPROVED"
                                                    ? "bg-green-500/10 text-green-400"
                                                    : "bg-slate-500/10 text-slate-400"
                                                    }`}
                                            >
                                                {latestVersion.status}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
