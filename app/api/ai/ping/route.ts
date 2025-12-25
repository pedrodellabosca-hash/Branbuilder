/**
 * AI Provider Health Check
 * 
 * GET /api/ai/ping
 * Returns provider status without exposing secrets.
 * 
 * This route is EXCLUDED from Clerk middleware via config.matcher in middleware.ts.
 * It will NEVER receive x-clerk-* or x-middleware-* headers.
 * DO NOT add auth checks here - it must remain fully public.
 */

import { NextResponse } from "next/server";
import { getAIProvider, getAIProviderType } from "@/lib/ai";

// Disable caching - health checks must always be fresh
export const dynamic = "force-dynamic";

// Common headers for all responses (no-cache + security)
const RESPONSE_HEADERS = {
    "Cache-Control": "no-store, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
    "X-Content-Type-Options": "nosniff",
};

export async function GET() {
    try {
        const provider = getAIProvider();
        const status = await provider.checkStatus();

        return NextResponse.json(
            {
                ok: true,
                provider: getAIProviderType(),
                ready: status.ready,
                error: status.error || null,
                timestamp: new Date().toISOString(),
            },
            { headers: RESPONSE_HEADERS }
        );
    } catch (error) {
        console.error("[AI Ping] Error:", error);
        return NextResponse.json(
            {
                ok: false,
                provider: getAIProviderType(),
                ready: false,
                error: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
            },
            { status: 500, headers: RESPONSE_HEADERS }
        );
    }
}
