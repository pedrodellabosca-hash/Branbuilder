import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import {
    businessPlanSectionService,
    InvalidSectionError,
    SectionConflictError,
} from "@/lib/business-plan/BusinessPlanSectionService";
import { BusinessPlanSectionKey } from "@prisma/client";

interface RouteParams {
    params: Promise<{ id: string }>;
}

type SectionInput = {
    key: string;
    content: Record<string, unknown>;
};

function isValidSectionKey(value: string): value is BusinessPlanSectionKey {
    return (Object.values(BusinessPlanSectionKey) as string[]).includes(value);
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { userId, orgId } = await auth();
        const { id: businessPlanId } = await params;

        if (!userId || !orgId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const org = await prisma.organization.findUnique({
            where: { clerkOrgId: orgId },
            select: { id: true },
        });

        if (!org) {
            return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
        }

        const businessPlan = await prisma.businessPlan.findFirst({
            where: { id: businessPlanId, project: { orgId: org.id } },
            select: { id: true },
        });

        if (!businessPlan) {
            return NextResponse.json({ error: "Business plan no encontrado" }, { status: 404 });
        }

        const body = await request.json();
        const sections = Array.isArray(body?.sections) ? (body.sections as SectionInput[]) : null;

        if (!sections || sections.length === 0) {
            return NextResponse.json({ error: "Secciones inválidas" }, { status: 400 });
        }

        const mapped = sections.map((section) => {
            if (!section || typeof section.key !== "string" || !isValidSectionKey(section.key)) {
                throw new InvalidSectionError("Clave inválida");
            }
            if (!section.content || typeof section.content !== "object") {
                throw new InvalidSectionError("Contenido inválido");
            }
            return {
                key: section.key as BusinessPlanSectionKey,
                content: section.content,
            };
        });

        const created = await businessPlanSectionService.createSections(businessPlanId, mapped);

        return NextResponse.json({ created }, { status: 201 });
    } catch (error) {
        if (error instanceof InvalidSectionError) {
            return NextResponse.json({ error: "Secciones inválidas" }, { status: 400 });
        }
        if (error instanceof SectionConflictError) {
            return NextResponse.json({ error: "Sección ya existe" }, { status: 409 });
        }
        console.error("Error creating business plan sections:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
