
import * as OTPAuth from "otpauth";
import { encrypt, decrypt } from "./encryption";
import { prisma } from "@/lib/db";

const APP_NAME = "BrandForge";

/**
 * Generate a new MFA secret for a user
 */
export function generateSecret() {
    const secret = new OTPAuth.Secret({ size: 20 });
    return secret.base32;
}

/**
 * Generate OTPAuth URL for QR Code
 */
export function generateOtpAuthUrl(email: string, secret: string) {
    const totp = new OTPAuth.TOTP({
        issuer: APP_NAME,
        label: email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
    });
    return totp.toString();
}

/**
 * Verify a token against a secret
 */
export function verifyToken(token: string, secret: string): boolean {
    const totp = new OTPAuth.TOTP({
        issuer: APP_NAME,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
    });

    const delta = totp.validate({ token, window: 1 });
    return delta !== null;
}

/**
 * Store user secret (Encrypted)
 */
export async function storeUserSecret(userId: string, secret: string) {
    const encrypted = encrypt(secret);
    // @ts-ignore
    return prisma.userMfaSecret.upsert({
        where: { userId },
        update: { encryptedSecret: encrypted, isEnabled: false }, // Reset verification
        create: {
            userId,
            encryptedSecret: encrypted,
            isEnabled: false,
        },
    });
}

/**
 * Enable MFA for user
 */
export async function enableMfa(userId: string) {
    // @ts-ignore
    return prisma.userMfaSecret.update({
        where: { userId },
        data: { isEnabled: true },
    });
}

/**
 * Validate User MFA (Full flow helper)
 */
export async function validateUserMfa(userId: string, token: string) {
    // @ts-ignore
    const record = await prisma.userMfaSecret.findUnique({ where: { userId } });
    if (!record || !record.isEnabled) return false;

    const secret = decrypt(record.encryptedSecret);
    return verifyToken(token, secret);
}
