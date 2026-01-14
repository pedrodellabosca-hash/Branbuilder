
import { auth } from "@clerk/nextjs/server";
import { Sidebar } from "@/components/admin/Sidebar";
import { isSuperAdmin } from "@/lib/admin/adminAuth";
import { redirect } from "next/navigation";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");

    const superAdmin = await isSuperAdmin(userId);
    if (!superAdmin) redirect("/");

    return (
        <div className="flex min-h-screen bg-slate-950 text-slate-100">
            <Sidebar role="SUPERADMIN" />
            <main className="flex-1 p-6 overflow-auto">
                {children}
            </main>
        </div>
    );
}
