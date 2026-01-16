import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { businessPlanService } from "@/lib/business-plan/BusinessPlanService";
import { businessPlanExportService } from "@/lib/business-plan/BusinessPlanExportService";

export const runtime = "nodejs";

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

        const buffer = await businessPlanExportService.exportPdf(document);
        const dateTag = new Date().toISOString().slice(0, 10);
        const filename = `business-plan_${document.businessPlanId}_v${document.snapshotVersion}_${dateTag}.pdf`;

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error("Error exporting business plan PDF:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
