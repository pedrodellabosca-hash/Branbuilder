/**
 * AI Provider Health Check
 * 
 * GET /api/ai/ping
 * Returns provider status without exposing secrets.
 * 
 * This route is PUBLIC (no auth required) - configured in middleware.ts
 */

import { NextResponse } from "next/server";
import { getAIProvider, getAIProviderType } from "@/lib/ai";

export async function GET() {
    try {
        const provider = getAIProvider();
        const status = await provider.checkStatus();

        return NextResponse.json({
            ok: true,
            provider: getAIProviderType(),
            ready: status.ready,
            error: status.error || null,
            timestamp: new Date().toISOString(),
        });
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
            { status: 500 }
        );
    }
}
