import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import {
    businessPlanSectionService,
    InvalidSectionError,
    SectionNotFoundError,
} from "@/lib/business-plan/BusinessPlanSectionService";
import { BusinessPlanSectionKey, Prisma } from "@prisma/client";

interface RouteParams {
    params: Promise<{ id: string }>;
}

type UpdateInput = {
    key: string;
    content: Prisma.InputJsonValue;
};

function isValidSectionKey(value: string): value is BusinessPlanSectionKey {
    return (Object.values(BusinessPlanSectionKey) as string[]).includes(value);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { userId, orgId } = await auth();
        const { id: businessPlanId } = await params;

        if (!userId || !orgId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const body = await request.json();
        const updates = Array.isArray(body?.updates) ? (body.updates as UpdateInput[]) : null;

        if (!updates || updates.length === 0) {
            return NextResponse.json({ error: "Actualizaciones inválidas" }, { status: 400 });
        }

        const mapped = updates.map((update) => {
            if (!update || typeof update.key !== "string" || !isValidSectionKey(update.key)) {
                throw new InvalidSectionError("Clave inválida");
            }
            if (!update.content || typeof update.content !== "object") {
                throw new InvalidSectionError("Contenido inválido");
            }
            return {
                key: update.key as BusinessPlanSectionKey,
                content: update.content as Prisma.InputJsonValue,
            };
        });

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

        const updated = await businessPlanSectionService.updateSectionsBatch(
            businessPlanId,
            mapped
        );

        return NextResponse.json({ updated });
    } catch (error) {
        if (error instanceof InvalidSectionError) {
            return NextResponse.json({ error: "Actualizaciones inválidas" }, { status: 400 });
        }
        if (error instanceof SectionNotFoundError) {
            return NextResponse.json({ error: "Sección no encontrada" }, { status: 404 });
        }
        console.error("Error updating business plan sections:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
