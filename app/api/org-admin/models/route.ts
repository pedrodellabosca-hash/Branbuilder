
import { requireOrgAdmin } from "@/lib/admin/adminAuth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { error, orgId } = await requireOrgAdmin();
    if (error) return error;

    try {
        const config = await (prisma as any).organizationAIConfig.findUnique({
            where: { orgId: orgId! }
        });

        // Default if not found
        if (!config) {
            return NextResponse.json({
                provider: "MOCK",
                model: "gpt-4o-mini",
                preset: "fast"
            });
        }

        return NextResponse.json(config);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const { error, orgId } = await requireOrgAdmin();
    if (error) return error;

    try {
        const body = await req.json();
        const { provider, model, preset } = body;

        // Validation / Guard
        // If provider is OPENAI but env var is missing, warn or block? 
        // User request: "si OPENAI no está ready, bloquear guardado o advertir."

        if (provider === "OPENAI" && !process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: "Cannot enable OpenAI: API Key not configured in server." }, { status: 400 });
        }

        const config = await (prisma as any).organizationAIConfig.upsert({
            where: { orgId: orgId! },
            create: {
                orgId: orgId!,
                provider,
                model,
                preset
            },
            update: {
                provider,
                model,
                preset
            }
        });

        return NextResponse.json(config);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
