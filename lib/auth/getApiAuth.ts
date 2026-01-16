import { auth } from "@clerk/nextjs/server";
import { validateE2EToken } from "@/lib/auth/e2e-token";

type ApiAuthContext = {
    userId: string;
    orgId: string;
    source: "clerk" | "e2e";
};

function canUseE2EAuth() {
    if (process.env.NODE_ENV === "production") return false;
    if (process.env.CI) return true;
    return Boolean(process.env.E2E_TEST_SECRET);
}

function getBearerToken(request: Request) {
    const header = request.headers.get("authorization") || "";
    const [scheme, token] = header.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) return null;
    return token.trim();
}

export async function getApiAuth(request: Request): Promise<ApiAuthContext | null> {
    if (!canUseE2EAuth()) {
        try {
            const { userId, orgId } = await auth();
            if (userId && orgId) {
                return { userId, orgId, source: "clerk" };
            }
        } catch {
            return null;
        }
        return null;
    }

    const token = getBearerToken(request);
    if (token) {
        const result = await validateE2EToken(token);
        if (result.valid) {
            return { userId: result.userId, orgId: result.orgId, source: "e2e" };
        }
        return null;
    }

    try {
        const { userId, orgId } = await auth();
        if (userId && orgId) {
            return { userId, orgId, source: "clerk" };
        }
    } catch {
        return null;
    }

    return null;
}
