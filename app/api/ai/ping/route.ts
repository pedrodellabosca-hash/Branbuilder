/**
 * AI Provider Health Check
 * 
 * GET /api/ai/ping
 * Returns provider status without exposing secrets.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAIProvider, getAIProviderType } from "@/lib/ai";

export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const provider = getAIProvider();
        const status = await provider.checkStatus();

        return NextResponse.json({
            provider: getAIProviderType(),
            ready: status.ready,
            error: status.error || null,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("[AI Ping] Error:", error);
        return NextResponse.json(
            {
                provider: getAIProviderType(),
                ready: false,
                error: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
            },
            { status: 500 }
        );
    }
}
