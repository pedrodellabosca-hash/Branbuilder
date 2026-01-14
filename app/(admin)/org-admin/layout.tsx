
import { auth } from "@clerk/nextjs/server";
import { Sidebar } from "@/components/admin/Sidebar";
import { requireOrgAdmin } from "@/lib/admin/adminAuth";
import { redirect } from "next/navigation";

export default async function OrgAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { error } = await requireOrgAdmin();
    if (error) redirect("/"); // Simple redirect if not org admin

    return (
        <div className="flex min-h-screen bg-slate-950 text-slate-100">
            <Sidebar role="ORG_ADMIN" />
            <main className="flex-1 p-6 overflow-auto">
                {children}
            </main>
        </div>
    );
}
