import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { businessPlanService } from "@/lib/business-plan/BusinessPlanService";

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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

        const document = await businessPlanService.getDocument(businessPlanId, org.id);

        if (!document) {
            return NextResponse.json({ error: "Business plan no encontrado" }, { status: 404 });
        }

        return NextResponse.json(document);
    } catch (error) {
        console.error("Error fetching business plan document:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
