
import { requireOrgAdmin } from "@/lib/admin/adminAuth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const { error, orgId, userId } = await requireOrgAdmin();
    if (error) return error;

    try {
        const body = await req.json();
        const { id, isActive } = body;

        if (!id) {
            return NextResponse.json({ error: "Prompt ID required" }, { status: 400 });
        }

        // Get the prompt to detect module/stage
        const target = await (prisma as any).promptSet.findUnique({
            where: { id }
        });

        if (!target) {
            return NextResponse.json({ error: "Prompt set not found" }, { status: 404 });
        }

        if (isActive) {
            // Deactivate others for same module/stage/org
            // Handle both NULL orgId (global) and Org-specific logic? 
            // If activating an Org prompt, it must take precedence. 
            // Currently our system just looks for isActive=true for the org.
            // If checking global, that's handled in retrieval logic (findFirst where org=X or null).
            // But here we just want to ensure only ONE is active PER org if it's an org prompt.

            // Note: If we have a GLOBAL active prompt, an Org active prompt should override it.
            // So we only need to deactivate other ORG-SPECIFIC prompts for this module/stage.

            if (target.orgId) {
                await (prisma as any).promptSet.updateMany({
                    where: {
                        orgId: target.orgId,
                        module: target.module,
                        stage: target.stage,
                        id: { not: id } // Deactivate siblings
                    },
                    data: { isActive: false }
                });
            } else {
                // Trying to activate a global prompt via Org Admin? Should be forbidden usually, 
                // unless superadmin. But assuming OrgAdmin can copy -> activate.
                // If target.orgId is null, this is a global prompt.
                return NextResponse.json({ error: "Cannot modify global prompts via Org Admin." }, { status: 403 });
            }
        }

        const updated = await (prisma as any).promptSet.update({
            where: { id },
            data: {
                isActive,
                activatedBy: userId,
                activatedAt: isActive ? new Date() : null
            }
        });

        return NextResponse.json({ success: true, prompt: updated });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
