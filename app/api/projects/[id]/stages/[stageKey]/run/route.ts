/**
 * POST /api/projects/[id]/stages/[stageKey]/run
 * 
 * Execute a stage generation job using centralized runStage service.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { moduleEngine } from "@/lib/modules/ModuleEngine";
import { createTokenLimitResponse } from "@/lib/utils/tokenErrors";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; stageKey: string }> }
) {
    try {
        const { userId, orgId } = await auth();

        if (!userId || !orgId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id: projectId, stageKey } = await params;

        // Parse optional body for overrides
        let body = {};
        try {
            if (request.headers.get("content-type")?.includes("application/json")) {
                body = await request.json();
            }
        } catch (e) {
            // Ignore parse errors, body remains empty
        }

        const { regenerate, seedText, preset, provider, model } = body as {
            regenerate?: boolean;
            seedText?: string;
            preset?: any;
            provider?: string;
            model?: string;
        };

        // Delegate to Module Engine
        const result = await moduleEngine.runStage({
            projectId,
            stageKey,
            userId,
            orgId,
            regenerate: regenerate ?? false,
            config: {
                preset,
                provider,
                model,
            }
        });

        if (!result.success && result.error) {
            // Determine status code based on error
            // New: Handle Token Gating
            if (result.error === "TOKEN_LIMIT_REACHED" || result.tokenLimitReached) {
                return createTokenLimitResponse({
                    plan: "BASIC", // Default fallback if not provided by result (needs upstream exposure or lookup)
                    canPurchaseMore: result.canPurchaseMore ?? false,
                    suggestUpgrade: result.suggestUpgrade ?? false,
                    remainingTokens: result.remainingTokens ?? 0,
                    estimatedTokens: result.estimatedTokens ?? 0,
                    reset: result.reset || { date: new Date(), daysRemaining: 0 }
                });
            }

            const status = result.error.includes("not found") ? 404 : 400;
            return NextResponse.json(
                { error: result.error },
                { status }
            );
        }

        return NextResponse.json({
            jobId: result.jobId,
            status: result.status,
            stageId: result.stageId,
            outputId: result.outputId,
            idempotent: result.idempotent || false,
            engineContext: result.engineContext,
        });
    } catch (error) {
        console.error("[Stage Run] Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
