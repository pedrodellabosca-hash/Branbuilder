
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateSecret, generateOtpAuthUrl, storeUserSecret } from "@/lib/security/mfa";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
    try {
        const user = await requireAuth();

        // Check if already enabled
        // @ts-ignore
        const existing = await prisma.userMfaSecret.findUnique({
            where: { userId: user.id },
        });

        if (existing?.isEnabled) {
            return NextResponse.json(
                { error: "MFA ya está habilitado. Debes desactivarlo primero." },
                { status: 400 }
            );
        }

        // Generate new secret
        const secret = generateSecret();
        const otpAuthUrl = generateOtpAuthUrl(user.email, secret);

        // Store (encrypted, disabled)
        await storeUserSecret(user.id, secret);

        return NextResponse.json({
            secret,
            otpAuthUrl,
        });
    } catch (error) {
        console.error("MFA Setup Error:", error);
        return NextResponse.json(
            { error: "Error iniciando setup de MFA" },
            { status: 500 }
        );
    }
}
