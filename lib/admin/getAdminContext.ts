import { auth } from "@clerk/nextjs/server";

const ADMIN_ROLE_ALLOWLIST = ["org:admin", "org:owner"] as const;

export type AdminContext = {
    userId: string | null;
    orgId: string | null;
    orgSlug: string | null;
    orgRole: string | null;
    isAdmin: boolean;
};

export async function getAdminContext(): Promise<AdminContext> {
    const { userId, orgId, orgSlug, orgRole } = await auth();
    const isAdmin = !!orgRole && ADMIN_ROLE_ALLOWLIST.includes(orgRole as (typeof ADMIN_ROLE_ALLOWLIST)[number]);

    return {
        userId: userId ?? null,
        orgId: orgId ?? null,
        orgSlug: orgSlug ?? null,
        orgRole: orgRole ?? null,
        isAdmin,
    };
}

export const ADMIN_ROLE_ALLOWLIST_VALUES = ADMIN_ROLE_ALLOWLIST;
