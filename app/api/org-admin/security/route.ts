
import { NextResponse } from "next/server";
import { requireOrgAdmin } from "@/lib/admin/adminAuth";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
    const { orgId, error } = await requireOrgAdmin();
    if (error || !orgId) return error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

    return NextResponse.json({
        mfaRequired: org.mfaRequired,
        ssoRequired: org.ssoRequired,
        domainRestriction: org.domainRestriction,
        ipAllowlist: org.ipAllowlist,
    });
}

export async function PATCH(req: Request) {
    const { orgId, userId, error } = await requireOrgAdmin();
    if (error || !orgId || !userId) return error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { mfaRequired, ssoRequired, domainRestriction, ipAllowlist } = body;

    // Update
    const updated = await prisma.organization.update({
        where: { id: orgId },
        data: {
            mfaRequired: mfaRequired ?? undefined,
            ssoRequired: ssoRequired ?? undefined,
            domainRestriction: domainRestriction ?? undefined,
            ipAllowlist: ipAllowlist ?? undefined,
        }
    });

    // Audit
    await writeAuditLog({
        orgId: orgId,
        userId: userId,
        action: "ORG_POLICY_UPDATED",
        resource: "organization",
        resourceId: orgId,
        metadata: { changes: body }
    });

    return NextResponse.json(updated);
}
