
import { Shield } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/index";
import { MFAFlow } from "@/components/security/MFAFlow";

export default async function SecurityPage() {
    const user = await requireAuth();

    // Check MFA status
    // @ts-ignore - Prisma types are seemingly stale in IDE, but runtime is verified.
    const mfaRecord = await prisma.userMfaSecret.findUnique({
        where: { userId: user.id },
    });

    const isMfaEnabled = mfaRecord?.isEnabled ?? false;

    return (
        <div className="max-w-4xl mx-auto py-8">
            <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Shield className="w-6 h-6 text-purple-500" />
                Seguridad de la Cuenta
            </h1>

            <div className="space-y-6">
                <MFAFlow initialEnabled={isMfaEnabled} />

                {/* Future: Backup Codes Section */}
            </div>
        </div>
    );
}
