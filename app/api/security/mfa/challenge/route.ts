
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { validateUserMfa } from "@/lib/security/mfa";
import { setMfaCookie } from "@/lib/security/enforcement";
import { writeAuditLog } from "@/lib/audit";
import { getActiveOrgId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verify } from 'crypto';

export async function POST(req: Request) {
    try {
        const user = await requireAuth();
        const { code, backup } = await req.json();

        if (!code) {
            return NextResponse.json({ error: "Código requerido" }, { status: 400 });
        }

        let verified = false;
        let method = "totp";

        if (backup) {
            // Backup Code verification
            // Find unused code that matches hash
            // Implementation deferred: T5 backup codes migration exists, but generation endpoints pending. 
            // Assume simplified check or implementation if 'generate' was called.
            // For now, if backup=true, we expect 'code' to be one of the plaintext backup codes user saved.
            // We need to fetch all hashed codes and compare.
            // @ts-ignore
            const codes = await prisma.userBackupCode.findMany({
                where: { userId: user.id, usedAt: null }
            });

            // Since we store hashes, we check simplisticly (bcrypt/scrypt) or if simplistic hash
            // Plan said "codeHash". 
            // Assuming we implemented 'verifyBackupCode' helper? No.
            // I'll skip backup verification implementation in this step to ensure TOTP works first.
            // Or verify TOTP.
            method = "backup";
            verified = false; // TODO
            return NextResponse.json({ error: "Backup codes not yet supported" }, { status: 501 });
        } else {
            verified = await validateUserMfa(user.id, code);
        }

        if (!verified) {
            return NextResponse.json({ error: "Código inválido" }, { status: 401 });
        }

        // Set Cookie
        await setMfaCookie(user.id);

        // Audit
        const orgId = await getActiveOrgId() || "unknown";
        await writeAuditLog({
            orgId,
            userId: user.id,
            action: "LOGIN_SUCCESS", // Or MFA_CHALLENGE_SUCCESS
            resource: "user",
            resourceId: user.id,
            metadata: { method }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("MFA Challenge Error:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
