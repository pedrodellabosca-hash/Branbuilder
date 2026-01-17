import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Palette, LineChart, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/db";
import { StageActions } from "@/components/project/StageActions";
import { StageConfigSelector } from "@/components/project/StageConfigSelector";
import { getVentureSnapshot } from "@/lib/venture/getVentureSnapshot";
import { VentureBriefEditor } from "@/components/venture/VentureBriefEditor";
import { getNextVentureStage } from "@/lib/venture/getNextVentureStage";
import { evaluateBriefQuality } from "@/lib/venture/briefQuality";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// Security: This page strictly handles GET requests (rendering).
// All mutations (POST/PUT/DELETE) must be directed to /api/... routes.

interface PageProps {
    params: Promise<{ id: string; stageKey: string }>;
    searchParams: Promise<{ jobId?: string; continue?: string }>;
}

async function getStageWithProject(
    stageKeyOrDisplay: string,
    projectId: string,
    dbOrgId: string
) {
    // Get stage with project - multi-tenant check via project.orgId
    // Search by either stageKey OR displayKey
    const stage = await prisma.stage.findFirst({
        where: {
            projectId,
            OR: [
                { stageKey: stageKeyOrDisplay },
                { displayKey: stageKeyOrDisplay } // Allow resolving by displayKey (e.g. "context")
            ],
            project: {
                orgId: dbOrgId,
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
                        select: {
                            version: true,
                            status: true,
                            generationParams: true, // Fetch metadata for fallback warning
                        },
                    },
                },
            },
        },
    });

    return stage;
}

async function getJobStatus(jobId: string, dbOrgId: string) {
    const job = await prisma.job.findFirst({
        where: {
            id: jobId,
            orgId: dbOrgId,
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
    const { userId, orgId: clerkOrgId } = await auth();
    const { id: projectId, stageKey } = await params;
    const { jobId: jobIdParam, continue: continueParam } = await searchParams;
    const continueAnyway = continueParam === "1";

    if (!userId) {
        redirect("/sign-in");
    }

    if (!clerkOrgId) {
        redirect("/projects");
    }

    // Optimization: Resolve org once for the page
    const org = await prisma.organization.findUnique({
        where: { clerkOrgId },
    });

    if (!org) {
        redirect("/projects");
    }

    const stage = await getStageWithProject(stageKey, projectId, org.id);

    if (!stage) {
        notFound();
    }

    // Canonical URL check: Redirect if current param isn't the true stageKey
    // This ensures API calls in sub-components always use the valid stageKey
    if (stageKey !== stage.stageKey) {
        let redirectUrl = `/projects/${projectId}/stages/${stage.stageKey}`;
        if (jobIdParam) {
            redirectUrl += `?jobId=${encodeURIComponent(jobIdParam)}`;
        }
        redirect(redirectUrl);
    }



    const ventureOrder = [
        "venture_intake",
        "venture_idea_validation",
        "venture_buyer_persona",
        "venture_business_plan",
    ] as const;
    const ventureLabels: Record<(typeof ventureOrder)[number], string> = {
        venture_intake: "Intake",
        venture_idea_validation: "Validación de idea",
        venture_buyer_persona: "Buyer Persona",
        venture_business_plan: "Business Plan",
    };

    const isVentureStage = ventureOrder.includes(stage.stageKey as (typeof ventureOrder)[number]);
    const ventureSnapshot = isVentureStage ? await getVentureSnapshot(projectId) : null;
    const ventureNext = isVentureStage ? await getNextVentureStage(projectId) : null;
    const stageConfig = (stage as any).config ?? {};
    const savedBrief = (stageConfig as { brief?: Record<string, string> }).brief ?? null;

    const briefPrefill = (() => {
        if (!ventureSnapshot) return {};
        switch (stage.stageKey) {
            case "venture_intake":
                return {
                    problem: ventureSnapshot.snapshot.problem ?? "",
                    targetMarket: ventureSnapshot.snapshot.audience ?? "",
                    productService: ventureSnapshot.snapshot.uvp ?? "",
                    constraints: ventureSnapshot.snapshot.assumptions ?? "",
                };
            case "venture_idea_validation":
                return {
                    hypotheses: ventureSnapshot.snapshot.assumptions ?? "",
                    competitors: "",
                    channels: "",
                    pricingAssumptions: "",
                };
            case "venture_buyer_persona":
                return {
                    personaSummary: ventureSnapshot.snapshot.persona ?? "",
                    pains: "",
                    desires: "",
                    objections: "",
                };
            case "venture_business_plan":
                return {
                    objective: ventureSnapshot.snapshot.problem ?? "",
                    revenueModel: "",
                    goToMarket: ventureSnapshot.snapshot.audience ?? "",
                    opsAssumptions: ventureSnapshot.snapshot.assumptions ?? "",
                };
            default:
                return {};
        }
    })() as Record<string, string>;

    const briefInitial = savedBrief ?? briefPrefill;
    const briefQuality = isVentureStage ? evaluateBriefQuality(stage.stageKey, briefInitial) : null;
    const warnThreshold = 60;

    const ventureIndex = isVentureStage ? ventureOrder.indexOf(stage.stageKey as (typeof ventureOrder)[number]) : -1;
    const missingPrereqs =
        ventureSnapshot && ventureIndex > 0
            ? ventureOrder
                  .slice(0, ventureIndex)
                  .filter((key) => {
                      const entry = ventureSnapshot.stages[key];
                      return !(entry.approved || entry.hasOutput);
                  })
            : [];
    const missingLinks = missingPrereqs.map((key) => ({
        key,
        label: ventureLabels[key],
        href: `/projects/${projectId}/stages/${key}`,
    }));

    // Get job status if jobId is in query
    let jobStatus: string | undefined;
    if (jobIdParam) {
        const job = await getJobStatus(jobIdParam, org.id);
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

                {/* AI Config Selector */}
                <div className="w-full max-w-sm">
                    <StageConfigSelector projectId={projectId} stageKey={stage.stageKey} />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <ModuleIcon className={`w-5 h-5 ${moduleColor}`} />
                            <span className="text-sm text-slate-400">
                                Módulo {stage.module}: {moduleName}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold text-white">
                            {stage.displayKey || stage.stageKey}. {stage.name}
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

            {ventureSnapshot && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Snapshot actual</h2>
                        <ul className="mt-2 space-y-1 text-sm text-slate-300">
                            {ventureSnapshot.snapshot.problem && (
                                <li><span className="text-slate-400">Problema:</span> {ventureSnapshot.snapshot.problem}</li>
                            )}
                            {ventureSnapshot.snapshot.audience && (
                                <li><span className="text-slate-400">Audiencia:</span> {ventureSnapshot.snapshot.audience}</li>
                            )}
                            {ventureSnapshot.snapshot.persona && (
                                <li><span className="text-slate-400">Persona:</span> {ventureSnapshot.snapshot.persona}</li>
                            )}
                            {ventureSnapshot.snapshot.uvp && (
                                <li><span className="text-slate-400">Propuesta de valor:</span> {ventureSnapshot.snapshot.uvp}</li>
                            )}
                            {ventureSnapshot.snapshot.assumptions && (
                                <li><span className="text-slate-400">Supuestos:</span> {ventureSnapshot.snapshot.assumptions}</li>
                            )}
                            {!ventureSnapshot.snapshot.problem &&
                                !ventureSnapshot.snapshot.audience &&
                                !ventureSnapshot.snapshot.persona &&
                                !ventureSnapshot.snapshot.uvp &&
                                !ventureSnapshot.snapshot.assumptions && (
                                    <li className="text-slate-500">Sin datos aún.</li>
                                )}
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-slate-200">Faltantes recomendados</h3>
                        {missingLinks.length === 0 ? (
                            <p className="mt-2 text-sm text-green-400">Todo listo para continuar.</p>
                        ) : (
                            <div className="mt-2 space-y-2">
                                <ul className="text-sm text-slate-300 list-disc list-inside">
                                    {missingLinks.map((missing) => (
                                        <li key={missing.key}>{missing.label}</li>
                                    ))}
                                </ul>
                                <div className="flex flex-wrap gap-3">
                                    {missingLinks.map((missing) => (
                                        <Link
                                            key={missing.key}
                                            href={missing.href}
                                            className="text-xs text-blue-400 underline"
                                        >
                                            Ir a {missing.label}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {ventureNext && ventureNext.nextStageKey && ventureNext.nextStageKey !== stage.stageKey && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                    <h2 className="text-lg font-semibold text-white">Siguiente recomendado</h2>
                    {briefQuality && briefQuality.score < warnThreshold && (
                        <p className="text-sm text-amber-300">
                            Tu brief está incompleto (score {briefQuality.score}). Puedes continuar,
                            pero se recomienda completar los campos críticos.
                        </p>
                    )}
                    <Link
                        href={`/projects/${projectId}/stages/${ventureNext.nextStageKey}`}
                        className="inline-flex items-center gap-2 rounded bg-blue-500 px-3 py-1.5 text-xs font-semibold text-slate-900"
                    >
                        Ir al siguiente paso
                    </Link>
                </div>
            )}

            {ventureNext && !ventureNext.nextStageKey && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <h2 className="text-lg font-semibold text-white">Fundamentos completos</h2>
                    <span
                        className={`mt-3 inline-flex text-xs font-semibold px-3 py-1.5 rounded ${ventureNext.doneApproved
                            ? "bg-green-500/10 text-green-400"
                            : "bg-amber-500/10 text-amber-300"
                            }`}
                    >
                        {ventureNext.doneApproved ? "Aprobados" : "Completos con outputs"}
                    </span>
                </div>
            )}

            {missingPrereqs.length > 0 && !continueAnyway && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
                    <div className="space-y-2">
                        <p className="text-sm text-amber-200">
                            Recomendado completar las etapas previas antes de continuar.
                        </p>
                        <p className="text-xs text-amber-300">
                            Pendientes: {missingPrereqs.map((key) => ventureLabels[key]).join(", ")}
                        </p>
                        <Link
                            href={{
                                pathname: `/projects/${projectId}/stages/${stage.stageKey}`,
                                query: {
                                    ...(jobIdParam ? { jobId: jobIdParam } : {}),
                                    continue: "1",
                                },
                            }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-amber-500 text-slate-900 text-xs font-semibold"
                        >
                            Continuar igual
                        </Link>
                    </div>
                </div>
            )}

            {ventureSnapshot && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Brief de la etapa</h2>
                    <VentureBriefEditor
                        projectId={projectId}
                        stageKey={stage.stageKey}
                        initialBrief={briefInitial}
                    />
                </div>
            )}

            {/* Actions Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Acciones</h2>
                <StageActions
                    projectId={projectId}
                    stageId={stage.id}
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

                                            {/* Fallback Warning */}
                                            {latestVersion && latestVersion.generationParams && (latestVersion.generationParams as any).fallbackWarning && (
                                                <div className="flex items-center gap-1.5 mt-1 text-xs text-yellow-500">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    <span>{(latestVersion.generationParams as any).fallbackWarning}</span>
                                                </div>
                                            )}
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
