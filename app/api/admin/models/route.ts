import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/admin/adminGuard";
import { redactSecrets } from "@/lib/security/redactSecrets";

export async function GET() {
    const authResult = await requireAdminApi();
    if (!authResult.ok) return authResult.response;

    const prismaAny = prisma as unknown as {
        modelCatalog?: {
            findMany: (args: unknown) => Promise<
                Array<{
                    id: string;
                    provider: string;
                    modelKey: string;
                    status: string;
                    capabilities: unknown;
                    lastSeenAt: Date | null;
                }>
            >;
        };
    };

    if (!prismaAny.modelCatalog?.findMany) {
        return NextResponse.json(
            { models: [], notAvailable: true },
            { headers: { "Cache-Control": "no-store" } }
        );
    }

    const models = await prismaAny.modelCatalog.findMany({
        orderBy: { lastSeenAt: "desc" },
        select: {
            id: true,
            provider: true,
            modelKey: true,
            status: true,
            capabilities: true,
            lastSeenAt: true,
        },
    });

    const payload = redactSecrets({ models, notAvailable: false });
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
