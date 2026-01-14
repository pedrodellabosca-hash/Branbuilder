
import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { prisma } from "@/lib/db";

const SSO_COOKIE = "custom_sso_session";
const SECRET_KEY = new TextEncoder().encode(process.env.MFA_SECRET_KEY || "dev_secret_sso_cookie");

export async function createCustomSession(userId: string, orgId: string, email: string) {
    const token = await new SignJWT({ userId, orgId, email })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(SECRET_KEY);

    const cookieStore = await cookies();
    cookieStore.set(SSO_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
    });
}

export async function getCustomSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SSO_COOKIE)?.value;
    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, SECRET_KEY);
        return {
            id: payload.userId as string,
            email: payload.email as string,
            firstName: "SSO",
            lastName: "User",
            imageUrl: "", // Placeholder or fetch from DB if synced
            orgId: payload.orgId as string, // Extra field helpful for context
        };
    } catch (e) {
        return null;
    }
}
