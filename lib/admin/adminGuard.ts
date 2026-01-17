import { NextResponse } from "next/server";
import { ADMIN_ROLE_ALLOWLIST_VALUES, getAdminContext } from "@/lib/admin/getAdminContext";

export type AdminAuthContext = {
    userId: string;
    orgId: string;
    orgRole: string;
    orgSlug: string | null;
};

export function isAdminRole(role: string | null | undefined): role is string {
    return !!role && ADMIN_ROLE_ALLOWLIST_VALUES.includes(role as (typeof ADMIN_ROLE_ALLOWLIST_VALUES)[number]);
}

export async function getAdminAuthContext() {
    const { userId, orgId, orgRole, orgSlug } = await getAdminContext();
    return {
        userId: userId ?? null,
        orgId: orgId ?? null,
        orgRole: orgRole ?? null,
        orgSlug: orgSlug ?? null,
    };
}

export async function requireAdminApi() {
    const { userId, orgId, orgRole, orgSlug, isAdmin } = await getAdminContext();

    if (!userId) {
        return {
            ok: false as const,
            response: NextResponse.json(
                { error: "Unauthorized" },
                { status: 401, headers: { "Cache-Control": "no-store" } }
            ),
        };
    }

    if (!orgId) {
        return {
            ok: false as const,
            response: NextResponse.json(
                { error: "No organization selected" },
                { status: 400, headers: { "Cache-Control": "no-store" } }
            ),
        };
    }

    if (!isAdmin) {
        return {
            ok: false as const,
            response: NextResponse.json(
                { error: "Forbidden" },
                { status: 403, headers: { "Cache-Control": "no-store" } }
            ),
        };
    }

    return {
        ok: true as const,
        context: {
            userId,
            orgId,
            orgRole: orgRole ?? "",
            orgSlug: orgSlug ?? null,
        } satisfies AdminAuthContext,
    };
}
