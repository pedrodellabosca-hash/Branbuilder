
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";

const MFA_COOKIE_NAME = "mfa_verified";
const SECRET_KEY = new TextEncoder().encode(process.env.MFA_SECRET_KEY || "dev_secret_mfa_cookie");

/**
 * Check if the current user needs MFA and hasn't verified
 * Call this in Server Components / Layouts
 */
export async function checkMfaEnforcement() {
    const user = await getCurrentUser();
    if (!user) return; // Not logged in, Clerk handles this

    // Check if user has MFA enabled
    // @ts-ignore
    const mfaRecord = await prisma.userMfaSecret.findUnique({
        where: { userId: user.id },
        select: { isEnabled: true },
    });

    // Check organization policy
    const { getActiveOrgId, getOrganization } = await import("@/lib/auth");
    const orgId = await getActiveOrgId();

    if (orgId) {
        const org = await getOrganization(orgId);
        // If Org requires MFA and User doesn't have it enabled -> Force Setup
        if (org?.mfaRequired && !mfaRecord?.isEnabled) {
            // Avoid redirect loop if already on security page
            // We can't check path here easily in server component without headers() mess or middleware.
            // But checkMfaEnforcement is called in Layout.
            // We should assume layout handles "is this security page?" check? 
            // Actually, layout doesn't know. 
            // Better to allow navigation to /security and /settings but block others?
            // For simplicity: Redirect to /security with query param
            redirect("/security?enforced=true");
        }
    }

    if (!mfaRecord?.isEnabled) {
        return; // MFA not enabled and not required by org
    }

    // Check if session cookie exists and is valid
    const cookieStore = await cookies();
    const token = cookieStore.get(MFA_COOKIE_NAME)?.value;

    if (token) {
        try {
            const { payload } = await jwtVerify(token, SECRET_KEY);
            if (payload.userId === user.id) {
                return; // Verified
            }
        } catch (e) {
            // Invalid token
        }
    }

    // Not verified -> Redirect
    redirect("/mfa-challenge");
}

/**
 * Set MFA verified cookie
 */
export async function setMfaCookie(userId: string) {
    const token = await new SignJWT({ userId })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h") // Re-verify every 24h
        .sign(SECRET_KEY);

    const cookieStore = await cookies();
    cookieStore.set(MFA_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
    });
}
