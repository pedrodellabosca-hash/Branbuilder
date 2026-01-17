import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import {
    businessPlanSectionService,
    SectionConflictError,
} from "@/lib/business-plan/BusinessPlanSectionService";

interface RouteParams {
    params: Promise<{ id: string }>;
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

        const created = await businessPlanSectionService.seedTemplate(businessPlanId);

        return NextResponse.json({ created }, { status: 201 });
    } catch (error) {
        if (error instanceof SectionConflictError) {
            return NextResponse.json({ error: "Sección ya existe" }, { status: 409 });
        }
        console.error("Error seeding business plan sections:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
