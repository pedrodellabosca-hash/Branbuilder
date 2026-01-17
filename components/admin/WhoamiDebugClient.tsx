"use client";

import { useEffect, useState } from "react";

type WhoamiPayload = {
    userId: string | null;
    orgId: string | null;
    orgRole: string | null;
    orgSlug: string | null;
    sessionClaims: Record<string, unknown>;
};

export function WhoamiDebugClient() {
    const [data, setData] = useState<WhoamiPayload | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        const load = async () => {
            try {
                const res = await fetch("/api/debug/whoami", { cache: "no-store" });
                if (!res.ok) {
                    throw new Error(`Failed to load whoami (${res.status})`);
                }
                const json = (await res.json()) as WhoamiPayload;
                if (active) setData(json);
            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to load whoami";
                if (active) setError(message);
            } finally {
                if (active) setLoading(false);
            }
        };

        load();
        return () => {
            active = false;
        };
    }, []);

    return (
        <div className="mt-6">
            <h2 className="text-lg font-semibold">/api/debug/whoami (client)</h2>
            {loading && <p className="mt-2 text-sm text-slate-400">Loading...</p>}
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
            {data && (
                <pre className="mt-2 rounded bg-slate-900 p-4 text-sm text-slate-200 overflow-auto">
                    {JSON.stringify(data, null, 2)}
                </pre>
            )}
        </div>
    );
}
