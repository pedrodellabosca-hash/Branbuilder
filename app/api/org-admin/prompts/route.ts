
import { requireOrgAdmin } from "@/lib/admin/adminAuth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/org-admin/prompts?stage=naming
export async function GET(req: NextRequest) {
    const { error, orgId } = await requireOrgAdmin();
    if (error) return error;

    const url = new URL(req.url);
    const stage = url.searchParams.get("stage");

    try {
        const where: any = {};
        if (stage) where.stage = stage;

        // Fetch Global AND Org specific
        // We want to see available prompts.
        // OR_condition: orgId = null OR orgId = currentOrg
        where.OR = [
            { orgId: null },
            { orgId: orgId! }
        ];

        const prompts = await prisma.promptSet.findMany({
            where,
            orderBy: [
                { module: 'asc' },
                { stage: 'asc' },
                { version: 'desc' }
            ]
        });

        return NextResponse.json(prompts);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST /api/org-admin/prompts - Create new version for Org
export async function POST(req: NextRequest) {
    const { error, orgId, userId } = await requireOrgAdmin();
    if (error) return error;

    try {
        const body = await req.json();
        const { stage, module, prompts: promptContent, notes, name } = body;

        // Verify we are creating strictly for this org
        const count = await (prisma as any).promptSet.count({
            where: {
                orgId: orgId!,
                stage,
                module
            }
        });

        const nextVersion = `v${count + 1}`;

        const newSet = await (prisma as any).promptSet.create({
            data: {
                orgId: orgId!,
                name: name || `${stage} Custom`,
                module,
                stage,
                version: nextVersion,
                prompts: promptContent,
                notes,
                createdBy: userId!,
                isActive: false // Draft by default
            }
        });

        return NextResponse.json(newSet);

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// PUT /api/org-admin/prompts/[id]/activate - Activate a prompt set
// Note: We'll handle activation via a separate route or specific PUT here.
// Let's assume standard REST for now, or just PUT /api/org-admin/prompts with { id, isActive: true }
// But activation is special because it toggles others off.
