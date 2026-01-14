
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { validateUserMfa, enableMfa } from "@/lib/security/mfa";
import { writeAuditLog } from "@/lib/audit";
import { getActiveOrgId } from "@/lib/auth"; // fallback if no org context, or use user's active org

export async function POST(req: Request) {
    try {
        const user = await requireAuth();
        const { token } = await req.json();

        if (!token) {
            return NextResponse.json({ error: "Token requerido" }, { status: 400 });
        }

        // Validate logic checks the STORED secret (must exist from setup)
        // Note: validateUserMfa checks isEnabled. 
        // BUT we are in "Verify/Enable" phase so isEnabled is false in DB.
        // We need a helper to verify against pending secret.

        // Custom verification for PENDING state
        const { decrypt, verifyToken } = await import("@/lib/security/encryption").then(async m => ({ decrypt: m.decrypt, verifyToken: (await import("@/lib/security/mfa")).verifyToken }));
        const { prisma } = await import("@/lib/db");

        // @ts-ignore
        const record = await prisma.userMfaSecret.findUnique({ where: { userId: user.id } });

        if (!record) {
            return NextResponse.json({ error: "No hay configuración pendiente." }, { status: 400 });
        }

        const secret = decrypt(record.encryptedSecret);
        const isValid = verifyToken(token, secret);

        if (!isValid) {
            return NextResponse.json({ error: "Código inválido." }, { status: 400 });
        }

        // Enable
        await enableMfa(user.id);

        // Audit
        const orgId = await getActiveOrgId() || "user-settings"; // tracking context
        await writeAuditLog({
            orgId,
            userId: user.id,
            action: "MFA_ENABLED",
            resource: "user",
            resourceId: user.id
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("MFA Verify Error:", error);
        return NextResponse.json(
            { error: "Error verificando MFA" },
            { status: 500 }
        );
    }
}
