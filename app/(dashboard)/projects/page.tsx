import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
    Plus,
    FolderKanban,
    Clock,
    Users,
    Palette,
    LineChart,
    AlertCircle,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";

// Force dynamic rendering - requires auth context
export const dynamic = "force-dynamic";

interface ProjectWithCounts {
    id: string;
    name: string;
    description: string | null;
    status: string;
    moduleA: boolean;
    moduleB: boolean;
    language: string;
    createdAt: Date;
    updatedAt: Date;
    _count: {
        members: number;
        outputs: number;
    };
}

/**
 * Gets or creates the organization in our DB.
 * This ensures the org exists even if the webhook hasn't fired yet.
 */
async function ensureOrganizationExists(clerkOrgId: string, userId: string) {
    // Try to find existing org with projects
    let org = await prisma.organization.findUnique({
        where: { clerkOrgId },
        include: {
            projects: {
                where: { status: { not: "DELETED" } },
                orderBy: { updatedAt: "desc" },
                include: {
                    _count: {
                        select: {
                            members: true,
                            outputs: true,
                        },
                    },
                },
            },
            _count: {
                select: { projects: true },
            },
        },
    });

    // If org doesn't exist, create it with the user as owner
    if (!org) {
        const orgName = "Mi Organización";
        const orgSlug = slugify(orgName) + "-" + clerkOrgId.slice(-6);

        org = await prisma.organization.create({
            data: {
                clerkOrgId,
                name: orgName,
                slug: orgSlug,
                plan: "BASIC",
                members: {
                    create: {
                        userId,
                        email: "", // Will be updated by webhook with actual email
                        role: "OWNER",
                    },
                },
            },
            include: {
                projects: {
                    where: { status: { not: "DELETED" } },
                    orderBy: { updatedAt: "desc" },
                    include: {
                        _count: {
                            select: {
                                members: true,
                                outputs: true,
                            },
                        },
                    },
                },
                _count: {
                    select: { projects: true },
                },
            },
        });
    } else {
        // Ensure user is a member
        const existingMember = await prisma.orgMember.findUnique({
            where: {
                orgId_userId: {
                    orgId: org.id,
                    userId,
                },
            },
        });

        if (!existingMember) {
            await prisma.orgMember.create({
                data: {
                    orgId: org.id,
                    userId,
                    email: "", // Will be updated by webhook
                    role: "MEMBER",
                },
            });
        }
    }

    return org;
}

export default async function ProjectsPage() {
    const { userId, orgId } = await auth();

    if (!userId) {
        redirect("/sign-in");
    }

    if (!orgId) {
        return <NoOrganizationState />;
    }

    // Auto-sync: ensure org exists in DB (creates if needed)
    const org = await ensureOrganizationExists(orgId, userId);
    const projects = org.projects as ProjectWithCounts[];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Proyectos</h1>
                    <p className="text-slate-400">
                        {projects.length === 0
                            ? "Crea tu primer proyecto para empezar"
                            : `${projects.length} proyecto${projects.length !== 1 ? "s" : ""} en ${org.name}`}
                    </p>
                </div>
                <Link
                    href="/projects/new"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Proyecto
                </Link>
            </div>

            {/* Projects Grid or Empty State */}
            {projects.length === 0 ? (
                <EmptyState orgName={org.name} />
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {projects.map((project) => (
                        <ProjectCard key={project.id} project={project} />
                    ))}
                </div>
            )}
        </div>
    );
}

function ProjectCard({ project }: { project: ProjectWithCounts }) {
    const statusColors: Record<string, string> = {
        CREATED: "bg-slate-500",
        IN_PROGRESS: "bg-blue-500",
        COMPLETED: "bg-green-500",
        REOPENED: "bg-yellow-500",
        ARCHIVED: "bg-slate-600",
    };

    const statusLabels: Record<string, string> = {
        CREATED: "Nuevo",
        IN_PROGRESS: "En progreso",
        COMPLETED: "Completado",
        REOPENED: "Reabierto",
        ARCHIVED: "Archivado",
    };

    return (
        <Link
            href={`/projects/${project.id}`}
            className="group block bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 hover:bg-slate-800/50 transition-all"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                    {project.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex items-center gap-2">
                    <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[project.status]} text-white`}
                    >
                        {statusLabels[project.status] || project.status}
                    </span>
                </div>
            </div>

            {/* Title & Description */}
            <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-blue-400 transition-colors">
                {project.name}
            </h3>
            {project.description && (
                <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                    {project.description}
                </p>
            )}

            {/* Modules */}
            <div className="flex items-center gap-2 mb-4">
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

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {project._count.members}
                    </span>
                    <span className="flex items-center gap-1">
                        <FolderKanban className="w-3.5 h-3.5" />
                        {project._count.outputs} outputs
                    </span>
                </div>
                <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatRelativeTime(project.updatedAt)}
                </span>
            </div>
        </Link>
    );
}

function EmptyState({ orgName }: { orgName: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-slate-900/50 border border-slate-800 border-dashed rounded-xl">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-6">
                <FolderKanban className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
                Crea tu primer proyecto
            </h2>
            <p className="text-slate-400 text-center max-w-md mb-6">
                Los proyectos contienen todo el trabajo de tu marca: naming, identidad visual,
                estrategia y más. Empieza creando uno para {orgName}.
            </p>
            <Link
                href="/projects/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
                <Plus className="w-4 h-4" />
                Crear primer proyecto
            </Link>
        </div>
    );
}

function NoOrganizationState() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mb-6">
                <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
                Selecciona una organización
            </h2>
            <p className="text-slate-400 max-w-sm mb-2">
                Para ver tus proyectos, primero selecciona o crea una organización
                usando el selector en la barra lateral.
            </p>
        </div>
    );
}

function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Ahora";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}
