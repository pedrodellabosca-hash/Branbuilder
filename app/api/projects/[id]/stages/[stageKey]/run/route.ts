/**
 * POST /api/projects/[id]/stages/[stageKey]/run
 * 
 * Execute a stage generation job using centralized runStage service.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { runStage } from "@/lib/stages/runStage";

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

        const { regenerate, seedText } = body as { regenerate?: boolean; seedText?: string };

        // Delegate to centralized runStage service
        const result = await runStage({
            projectId,
            stageKey,
            regenerate: regenerate ?? false,
            seedText,
            userId,
            orgId,
        });

        if (!result.success && result.error) {
            // Determine status code based on error
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
        });
    } catch (error) {
        console.error("[Stage Run] Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
