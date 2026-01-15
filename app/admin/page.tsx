import { auth } from "@clerk/nextjs/server";
import { WhoamiDebugClient } from "@/components/admin/WhoamiDebugClient";

export default async function AdminPage() {
    const { userId, orgId, orgRole, orgSlug } = await auth();

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
            <h1 className="text-2xl font-semibold">Admin access OK</h1>

            <div className="mt-6 space-y-2">
                <a className="text-blue-400 underline" href="/admin/ai">/admin/ai</a>
                <a className="text-blue-400 underline" href="/admin/registry">/admin/registry</a>
                <a className="text-blue-400 underline" href="/admin/ops">/admin/ops</a>
            </div>

            <div className="mt-6">
                <h2 className="text-lg font-semibold">Clerk session (server)</h2>
                <pre className="mt-2 rounded bg-slate-900 p-4 text-sm text-slate-200 overflow-auto">
                    {JSON.stringify({ userId, orgId, orgRole, orgSlug }, null, 2)}
                </pre>
            </div>

            <WhoamiDebugClient />
        </div>
    );
}
