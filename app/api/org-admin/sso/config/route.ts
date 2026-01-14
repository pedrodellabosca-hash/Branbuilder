
import { NextResponse } from "next/server";
import { requireOrgAdmin } from "@/lib/admin/adminAuth";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
    const { orgId, error } = await requireOrgAdmin();
    if (error || !orgId) return error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // @ts-ignore
    const config = await prisma.organizationSSOConfig.findUnique({
        where: { orgId }
    });

    return NextResponse.json(config || {});
}

export async function POST(req: Request) {
    const { orgId, userId, error } = await requireOrgAdmin();
    if (error || !orgId || !userId) return error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { entryPoint, issuer, cert } = await req.json();

    // @ts-ignore
    const config = await prisma.organizationSSOConfig.upsert({
        where: { orgId },
        update: { entryPoint, issuer, cert },
        create: { orgId, entryPoint, issuer, cert }
    });

    // Also ensure flag is enabled? Or separate toggle?
    // User needs to manually toggle "Require SSO" in policy page.

    await writeAuditLog({
        orgId,
        userId,
        action: "SSO_CONFIGURED",
        resource: "organization_sso_config",
        resourceId: config.id
    });

    return NextResponse.json(config);
}
