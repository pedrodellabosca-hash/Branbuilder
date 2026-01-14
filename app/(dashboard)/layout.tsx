
import { auth } from "@clerk/nextjs/server";
import { isSuperAdmin } from "@/lib/admin/adminAuth";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { userId } = await auth();
    const isSuper = userId ? await isSuperAdmin(userId) : false;

    // MFA Enforcement
    const { checkMfaEnforcement } = await import("@/lib/security/enforcement");
    await checkMfaEnforcement();

    return (
        <DashboardShell isSuperAdmin={isSuper}>
            {children}
        </DashboardShell>
    );
}
