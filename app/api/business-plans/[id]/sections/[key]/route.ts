import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import {
    businessPlanSectionService,
    InvalidSectionError,
    SectionNotFoundError,
} from "@/lib/business-plan/BusinessPlanSectionService";
import { BusinessPlanSectionKey } from "@prisma/client";

interface RouteParams {
    params: Promise<{ id: string; key: string }>;
}

function isValidSectionKey(value: string): value is BusinessPlanSectionKey {
    return (Object.values(BusinessPlanSectionKey) as string[]).includes(value);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { userId, orgId } = await auth();
        const { id: businessPlanId, key } = await params;

        if (!userId || !orgId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        if (!isValidSectionKey(key)) {
            return NextResponse.json({ error: "Clave inválida" }, { status: 400 });
        }

        const body = await request.json();
        const content = body?.content;

        if (!content || typeof content !== "object") {
            return NextResponse.json({ error: "Contenido inválido" }, { status: 400 });
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

        const updated = await businessPlanSectionService.updateSection(
            businessPlanId,
            key,
            content
        );

        return NextResponse.json({ updated });
    } catch (error) {
        if (error instanceof InvalidSectionError) {
            return NextResponse.json({ error: "Contenido inválido" }, { status: 400 });
        }
        if (error instanceof SectionNotFoundError) {
            return NextResponse.json({ error: "Sección no encontrada" }, { status: 404 });
        }
        console.error("Error updating business plan section:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
