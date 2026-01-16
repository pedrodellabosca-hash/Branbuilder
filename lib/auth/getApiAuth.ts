import { auth } from "@clerk/nextjs/server";
import { validateE2EToken } from "@/lib/auth/e2e-token";

type ApiAuthContext = {
    userId: string;
    orgId: string;
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
    const { userId, orgId } = await auth();
    if (userId && orgId) {
        return { userId, orgId };
    }

    if (!canUseE2EAuth()) {
        return null;
    }

    const token = getBearerToken(request);
    if (!token) return null;

    const result = await validateE2EToken(token);
    if (!result.valid) return null;

    return { userId: result.userId, orgId: result.orgId };
}
