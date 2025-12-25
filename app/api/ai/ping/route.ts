/**
 * AI Provider Health Check
 * 
 * GET /api/ai/ping
 * Returns provider status without exposing secrets.
 * 
 * This route is PUBLIC (configured in middleware.ts isPublicRoute)
 */

import { NextResponse } from "next/server";
import { getAIProvider, getAIProviderType } from "@/lib/ai";

// Disable caching for health checks
export const dynamic = "force-dynamic";

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
            {
                headers: {
                    "Cache-Control": "no-store, max-age=0",
                    "Pragma": "no-cache",
                    "Expires": "0",
                },
            }
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
            {
                status: 500,
                headers: {
                    "Cache-Control": "no-store, max-age=0",
                    "Pragma": "no-cache",
                    "Expires": "0",
                },
            }
        );
    }
}
