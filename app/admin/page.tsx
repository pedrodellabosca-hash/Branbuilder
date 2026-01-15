import { AdminConsoleClient } from "@/components/admin/AdminConsoleClient";

export default async function AdminPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
            <AdminConsoleClient />
        </div>
    );
}
