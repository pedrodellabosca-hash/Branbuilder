import { headers } from "next/headers";

async function fetchWhoami() {
    const headerList = headers();
    const host = headerList.get("host");
    const proto = headerList.get("x-forwarded-proto") ?? "http";
    const origin = host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_APP_URL ?? "";

    const res = await fetch(`${origin}/api/debug/whoami`, {
        cache: "no-store",
    });
    if (!res.ok) {
        return { error: `Failed to load whoami (${res.status})` };
    }
    return res.json();
}

export default async function AdminPage() {
    const whoami = await fetchWhoami();

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
            <h1 className="text-2xl font-semibold">Admin access OK</h1>

            <div className="mt-6 space-y-2">
                <a className="text-blue-400 underline" href="/admin/ai">/admin/ai</a>
                <a className="text-blue-400 underline" href="/admin/registry">/admin/registry</a>
                <a className="text-blue-400 underline" href="/admin/ops">/admin/ops</a>
            </div>

            <div className="mt-6">
                <h2 className="text-lg font-semibold">/api/debug/whoami</h2>
                <pre className="mt-2 rounded bg-slate-900 p-4 text-sm text-slate-200 overflow-auto">
                    {JSON.stringify(whoami, null, 2)}
                </pre>
            </div>
        </div>
    );
}
