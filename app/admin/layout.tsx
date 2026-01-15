import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAdminAuthContext, isAdminRole } from "@/lib/admin/adminGuard";

export default async function AdminLayout({ children }: { children: ReactNode }) {
    const { userId, orgRole } = await getAdminAuthContext();

    if (!userId) {
        redirect("/sign-in");
    }

    if (!isAdminRole(orgRole)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
                <div className="max-w-xl rounded border border-slate-800 bg-slate-900 p-6">
                    <h1 className="text-xl font-semibold">403 - Admin access denied</h1>
                    <p className="mt-2 text-sm text-slate-300">
                        You are signed in but do not have the required organization role to access
                        this area.
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
