import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createProjectSchema = z.object({
    name: z.string().min(1, "El nombre es requerido").max(100),
    description: z.string().max(500).optional().nullable(),
    language: z.enum(["ES", "EN"]).default("ES"),
    moduleA: z.boolean().default(false),
    moduleB: z.boolean().default(false),
});

// GET /api/projects - List projects for current org
export async function GET(request: NextRequest) {
    try {
        const { userId, orgId } = await auth();

        if (!userId || !orgId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        // Get org from our DB
        const org = await prisma.organization.findUnique({
            where: { clerkOrgId: orgId },
        });

        if (!org) {
            return NextResponse.json(
                { error: "Organización no encontrada" },
                { status: 404 }
            );
        }

        // Get projects with member count
        const projects = await prisma.project.findMany({
            where: {
                orgId: org.id,
                status: { not: "DELETED" },
            },
            include: {
                _count: {
                    select: {
                        members: true,
                        outputs: true,
                    },
                },
            },
            orderBy: { updatedAt: "desc" },
        });

        return NextResponse.json(projects);
    } catch (error) {
        console.error("Error fetching projects:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
    try {
        const { userId, orgId } = await auth();

        if (!userId || !orgId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        // Get org from our DB
        const org = await prisma.organization.findUnique({
            where: { clerkOrgId: orgId },
            include: {
                members: {
                    where: { userId },
                },
                _count: { select: { projects: true } },
            },
        });

        if (!org) {
            return NextResponse.json(
                { error: "Organización no encontrada" },
                { status: 404 }
            );
        }

        // Check if user is member and has permission to create projects
        const member = org.members[0];
        if (!member || member.role === "MEMBER") {
            // Members can't create projects by default
            return NextResponse.json(
                { error: "No tienes permisos para crear proyectos" },
                { status: 403 }
            );
        }

        // Check project limit
        if (org._count.projects >= org.maxProjects) {
            return NextResponse.json(
                {
                    error: `Has alcanzado el límite de ${org.maxProjects} proyectos para tu plan`,
                },
                { status: 403 }
            );
        }

        // Parse and validate body
        const body = await request.json();
        const validation = createProjectSchema.safeParse(body);

        if (!validation.success) {
            const issues = validation.error.issues;
            return NextResponse.json(
                { error: issues[0]?.message || "Datos inválidos" },
                { status: 400 }
            );
        }

        const { name, description, language, moduleA, moduleB } = validation.data;

        // Must select at least one module
        if (!moduleA && !moduleB) {
            return NextResponse.json(
                { error: "Debes seleccionar al menos un módulo" },
                { status: 400 }
            );
        }

        // Create project with stages
        const project = await prisma.$transaction(async (tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => {
            // Create the project
            const newProject = await tx.project.create({
                data: {
                    orgId: org.id,
                    name,
                    description,
                    language,
                    moduleA,
                    moduleB,
                    members: {
                        create: {
                            userId,
                            email: member.email,
                            role: "PROJECT_OWNER",
                        },
                    },
                },
            });

            // Create stages based on enabled modules
            const stages = [];

            if (moduleA) {
                stages.push(
                    { stageKey: "A1", name: "Contexto & Posicionamiento", module: "A" as const, order: 1 },
                    { stageKey: "A2", name: "Naming Estratégico", module: "A" as const, order: 2 },
                    { stageKey: "A3", name: "Manifiesto & Narrativa", module: "A" as const, order: 3 },
                    { stageKey: "A4", name: "Identidad Visual", module: "A" as const, order: 4 },
                    { stageKey: "A5", name: "Aplicaciones de Marca", module: "A" as const, order: 5 },
                    { stageKey: "A6", name: "Cierre / Entrega", module: "A" as const, order: 6 }
                );
            }

            if (moduleB) {
                const baseOrder = moduleA ? 7 : 1;
                stages.push(
                    { stageKey: "B1", name: "Briefing (PM)", module: "B" as const, order: baseOrder },
                    { stageKey: "B2", name: "Consumer Insights", module: "B" as const, order: baseOrder + 1 },
                    { stageKey: "B3", name: "Competitive Strategy", module: "B" as const, order: baseOrder + 2 },
                    { stageKey: "B4", name: "CSO (Cascada de Elecciones)", module: "B" as const, order: baseOrder + 3 },
                    { stageKey: "B5", name: "Brand Metrics", module: "B" as const, order: baseOrder + 4 },
                    { stageKey: "B6", name: "Brand Narrative", module: "B" as const, order: baseOrder + 5 },
                    { stageKey: "B7", name: "Integración PM + Verificación", module: "B" as const, order: baseOrder + 6 },
                    { stageKey: "B8", name: "Entrega Strategy Pack", module: "B" as const, order: baseOrder + 7 }
                );
            }

            // Create all stages
            await tx.stage.createMany({
                data: stages.map((s) => ({
                    projectId: newProject.id,
                    ...s,
                })),
            });

            // Create Brand Core Profile
            await tx.brandCoreProfile.create({
                data: {
                    projectId: newProject.id,
                },
            });

            // Log audit
            await tx.auditLog.create({
                data: {
                    orgId: org.id,
                    userId,
                    userEmail: member.email,
                    action: "PROJECT_CREATED",
                    resource: "project",
                    resourceId: newProject.id,
                    metadata: { name, moduleA, moduleB, language },
                },
            });

            return newProject;
        });

        return NextResponse.json(project, { status: 201 });
    } catch (error) {
        console.error("Error creating project:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
