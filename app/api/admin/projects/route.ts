import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/admin/adminGuard";

export async function GET() {
    const authResult = await requireAdminApi();
    if (!authResult.ok) return authResult.response;

    const { context } = authResult;
    const projects = await prisma.project.findMany({
        where: { orgId: context.orgId },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, createdAt: true },
    });

    return NextResponse.json(
        { projects },
        { headers: { "Cache-Control": "no-store" } }
    );
}
