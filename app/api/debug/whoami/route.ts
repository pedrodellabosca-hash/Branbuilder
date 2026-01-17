import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

function pickOrgClaims(claims: Record<string, unknown> | null | undefined) {
    if (!claims) return {};
    const entries = Object.entries(claims).filter(([key]) => key.includes("org"));
    return Object.fromEntries(entries);
}

export async function GET() {
    const { userId, orgId, orgRole, orgSlug, sessionClaims } = await auth();

    const payload = {
        userId: userId ?? null,
        orgId: orgId ?? null,
        orgRole: orgRole ?? null,
        orgSlug: orgSlug ?? null,
        sessionClaims: pickOrgClaims(sessionClaims as Record<string, unknown> | undefined),
    };

    console.log("[debug/whoami]", payload);

    return NextResponse.json(payload);
}
